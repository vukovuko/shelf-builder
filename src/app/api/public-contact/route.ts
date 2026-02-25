import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/db/db";
import { contactMessages, user } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { sendEmail } from "@/lib/email-rate-limiter";
import { escapeHtml } from "@/lib/utils";
import {
  strictRateLimit,
  getIdentifier,
  rateLimitResponse,
} from "@/lib/upstash-rate-limit";

const publicContactSchema = z.object({
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
    // Rate limit - 5 contact messages per minute per IP
    const identifier = getIdentifier(request);
    const { success, reset } = await strictRateLimit.limit(identifier);
    if (!success) {
      return rateLimitResponse(reset);
    }

    const body = await request.json();
    const parsed = publicContactSchema.safeParse(body);

    if (!parsed.success) {
      const firstError = parsed.error.issues[0];
      return NextResponse.json(
        { error: firstError?.message || "Neispravni podaci" },
        { status: 400 },
      );
    }

    const { name, email, phone, message, turnstileToken } = parsed.data;

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

    // Insert into database (no userId for public submissions)
    await db.insert(contactMessages).values({
      userId: null,
      name,
      email: email || null,
      phone: phone || null,
      wardrobeId: null,
      message,
      status: "new",
    });

    // Get all admins who have opted in to receive order emails
    const admins = await db
      .select({ email: user.email })
      .from(user)
      .where(and(eq(user.role, "admin"), eq(user.receiveOrderEmails, true)));

    // Escape user input to prevent HTML injection
    const safeName = escapeHtml(name);
    const safeEmail = email ? escapeHtml(email) : null;
    const safePhone = phone ? escapeHtml(phone) : null;
    const safeMessage = escapeHtml(message).replace(/\n/g, "<br />");

    for (const admin of admins) {
      await sendEmail({
        to: admin.email,
        subject: `Nova kontakt poruka (javna) - ${safeName}`,
        html: `
          <h2>Nova kontakt poruka (javna forma)</h2>
          <p><strong>Od:</strong> ${safeName}</p>
          ${safeEmail ? `<p><strong>Email:</strong> ${safeEmail}</p>` : ""}
          ${safePhone ? `<p><strong>Telefon:</strong> ${safePhone}</p>` : ""}
          <hr />
          <p><strong>Poruka:</strong></p>
          <p>${safeMessage}</p>
        `,
      });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[POST /api/public-contact] Error:", error);
    return NextResponse.json(
      { error: "Greška pri slanju poruke" },
      { status: 500 },
    );
  }
}
