import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { db } from "@/db/db";
import { contactMessages, user, wardrobes } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { sendEmail } from "@/lib/email-rate-limiter";
import { escapeHtml } from "@/lib/utils";
import { rateLimiters, getClientIp } from "@/lib/rate-limiter";

const contactSchema = z.object({
  name: z
    .string()
    .min(2, "Ime mora imati najmanje 2 karaktera")
    .max(100, "Ime je predugačko"),
  email: z.string().email("Neispravan email format").nullable().optional(),
  phone: z
    .string()
    .max(30, "Broj telefona je predugačak")
    .nullable()
    .optional(),
  wardrobeId: z.string().uuid().nullable().optional(),
  message: z
    .string()
    .min(10, "Poruka mora imati najmanje 10 karaktera")
    .max(5000, "Poruka je predugačka"),
  turnstileToken: z.string().min(1, "Verifikacija je obavezna"),
});

async function verifyTurnstileToken(token: string): Promise<boolean> {
  const response = await fetch(
    "https://challenges.cloudflare.com/turnstile/v0/siteverify",
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        secret: process.env.TURNSTILE_SECRET_KEY,
        response: token,
      }),
    },
  );
  const data = await response.json();
  return data.success === true;
}

export async function POST(request: Request) {
  try {
    // Rate limiting - 3 contact messages per minute per IP
    const clientIp = getClientIp(request);
    const rateLimit = rateLimiters.contact(clientIp);
    if (!rateLimit.allowed) {
      return NextResponse.json(
        { error: "Previše zahteva. Pokušajte ponovo za minut." },
        {
          status: 429,
          headers: {
            "X-RateLimit-Limit": String(rateLimit.limit),
            "X-RateLimit-Remaining": String(rateLimit.remaining),
            "X-RateLimit-Reset": String(rateLimit.resetAt),
            "Retry-After": String(
              Math.max(0, rateLimit.resetAt - Math.floor(Date.now() / 1000)),
            ),
          },
        },
      );
    }

    // Get session (optional - could allow guest messages in future)
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session?.user) {
      return NextResponse.json(
        { error: "Morate biti prijavljeni" },
        { status: 401 },
      );
    }

    const body = await request.json();
    const parsed = contactSchema.safeParse(body);

    if (!parsed.success) {
      const firstError = parsed.error.issues[0];
      return NextResponse.json(
        { error: firstError?.message || "Neispravni podaci" },
        { status: 400 },
      );
    }

    const { name, email, phone, wardrobeId, message, turnstileToken } =
      parsed.data;

    // Verify Turnstile token
    const isValidToken = await verifyTurnstileToken(turnstileToken);
    if (!isValidToken) {
      return NextResponse.json(
        { error: "Verifikacija nije uspela. Pokušajte ponovo." },
        { status: 400 },
      );
    }

    // Validate at least one contact method
    if (!email && !phone) {
      return NextResponse.json(
        { error: "Unesite email ili broj telefona" },
        { status: 400 },
      );
    }

    // Insert into database
    await db.insert(contactMessages).values({
      userId: session.user.id,
      name,
      email: email || null,
      phone: phone || null,
      wardrobeId: wardrobeId || null,
      message,
      status: "new",
    });

    // Get all admins who have opted in to receive order emails
    const admins = await db
      .select({ email: user.email })
      .from(user)
      .where(and(eq(user.role, "admin"), eq(user.receiveOrderEmails, true)));

    // Get wardrobe name if wardrobeId is provided
    let wardrobeName: string | null = null;
    if (wardrobeId) {
      const result = await db
        .select({ name: wardrobes.name })
        .from(wardrobes)
        .where(eq(wardrobes.id, wardrobeId));
      wardrobeName = result[0]?.name || null;
    }

    // Send notification to all opted-in admins (rate limiter handles delays)
    // Escape user input to prevent HTML injection
    const safeName = escapeHtml(name);
    const safeEmail = email ? escapeHtml(email) : null;
    const safePhone = phone ? escapeHtml(phone) : null;
    const safeWardrobeName = wardrobeName ? escapeHtml(wardrobeName) : null;
    const safeMessage = escapeHtml(message).replace(/\n/g, "<br />");

    for (const admin of admins) {
      await sendEmail({
        to: admin.email,
        subject: `Nova kontakt poruka - ${safeName}`,
        html: `
          <h2>Nova kontakt poruka</h2>
          <p><strong>Od:</strong> ${safeName}</p>
          ${safeEmail ? `<p><strong>Email:</strong> ${safeEmail}</p>` : ""}
          ${safePhone ? `<p><strong>Telefon:</strong> ${safePhone}</p>` : ""}
          ${safeWardrobeName ? `<p><strong>Orman:</strong> ${safeWardrobeName}</p>` : ""}
          <hr />
          <p><strong>Poruka:</strong></p>
          <p>${safeMessage}</p>
        `,
      });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[POST /api/contact] Error:", error);
    return NextResponse.json(
      { error: "Greška pri slanju poruke" },
      { status: 500 },
    );
  }
}
