import { and, desc, eq } from "drizzle-orm";
import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/db/db";
import { account, orders, user } from "@/db/schema";
import { auth } from "@/lib/auth";
import { validatePassword } from "@/lib/password-validation";
import { verifyTurnstile } from "@/lib/turnstile";
import {
  checkRateLimit,
  getIdentifier,
  strictRateLimit,
} from "@/lib/upstash-rate-limit";

// Helper function to copy shipping address from most recent order to user profile
async function copyShippingAddressFromOrders(userId: string, email: string) {
  try {
    // Check if user already has a shipping address
    const [userData] = await db
      .select({ shippingStreet: user.shippingStreet })
      .from(user)
      .where(eq(user.id, userId));

    if (userData?.shippingStreet) {
      // User already has an address, don't overwrite
      return;
    }

    // Find most recent order with this email that has a shipping address
    const [recentOrder] = await db
      .select({
        shippingStreet: orders.shippingStreet,
        shippingApartment: orders.shippingApartment,
        shippingCity: orders.shippingCity,
        shippingPostalCode: orders.shippingPostalCode,
      })
      .from(orders)
      .where(eq(orders.customerEmail, email))
      .orderBy(desc(orders.createdAt))
      .limit(1);

    if (recentOrder?.shippingStreet) {
      // Copy shipping address to user profile
      await db
        .update(user)
        .set({
          shippingStreet: recentOrder.shippingStreet,
          shippingApartment: recentOrder.shippingApartment,
          shippingCity: recentOrder.shippingCity,
          shippingPostalCode: recentOrder.shippingPostalCode,
          updatedAt: new Date(),
        })
        .where(eq(user.id, userId));
    }
  } catch (error) {
    // Non-critical error - log but don't fail registration
    console.error("Failed to copy shipping address from orders:", error);
  }
}

const signupSchema = z.object({
  email: z.string().email("Neispravan email format"),
  password: z.string().min(8, "Lozinka mora imati najmanje 8 karaktera"),
  name: z.string().trim().min(1, "Ime je obavezno").max(100),
  turnstileToken: z.string().min(1, "Verifikacija je obavezna"),
});

export async function POST(request: Request) {
  try {
    // Rate limit - 5 signup attempts per minute per IP
    const identifier = getIdentifier(request);
    const limited = await checkRateLimit(strictRateLimit, identifier);
    if (limited) return limited;

    const body = await request.json();
    const validation = signupSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: validation.error.issues[0].message },
        { status: 400 },
      );
    }

    const { email, password, name, turnstileToken } = validation.data;

    const passwordCheck = validatePassword(password);
    if (!passwordCheck.valid) {
      return NextResponse.json({ error: passwordCheck.error }, { status: 400 });
    }

    if (!(await verifyTurnstile(turnstileToken, identifier))) {
      return NextResponse.json(
        { error: "Verifikacija nije uspela. Pokušajte ponovo." },
        { status: 400 },
      );
    }

    // Check if user with this email exists
    const [existingUser] = await db
      .select({ id: user.id })
      .from(user)
      .where(eq(user.email, email));

    if (existingUser) {
      // User exists - check if they have a credential account
      const [existingAccount] = await db
        .select({ id: account.id })
        .from(account)
        .where(
          and(
            eq(account.userId, existingUser.id),
            eq(account.providerId, "credential"),
          ),
        );

      if (existingAccount) {
        // User already has an account - they should login instead
        return NextResponse.json(
          { error: "Korisnik sa ovim emailom već postoji. Prijavite se." },
          { status: 400 },
        );
      }

      // Existing user without a password (Google login, guest checkout,
      // admin-created). Setting a password requires proof of owning the inbox,
      // so email a set-password link instead of trusting this request.
      try {
        await auth.api.requestPasswordReset({
          body: { email, redirectTo: "/reset-password" },
        });
      } catch (resetError) {
        console.error("Failed to send set-password email:", resetError);
      }

      return NextResponse.json({
        success: true,
        emailSent: true,
        message:
          "Poslali smo vam email sa linkom za postavljanje lozinke. Otvorite ga da biste pristupili nalogu.",
      });
    }

    // User doesn't exist - use normal Better Auth signup
    try {
      const result = await auth.api.signUpEmail({
        body: { email, password, name },
        headers: await headers(),
      });

      // Copy shipping address from most recent order if available
      if (result.user?.id) {
        await copyShippingAddressFromOrders(result.user.id, email);
      }

      // No session yet: the account activates from the emailed link.
      return NextResponse.json({
        success: true,
        verificationRequired: true,
        message:
          "Nalog je kreiran. Poslali smo vam email sa linkom za aktivaciju naloga.",
      });
    } catch (signupError) {
      console.error("Signup error:", signupError);
      return NextResponse.json(
        { error: "Greška pri registraciji" },
        { status: 500 },
      );
    }
  } catch (error) {
    console.error("Signup with link error:", error);
    return NextResponse.json(
      { error: "Greška pri obradi zahteva" },
      { status: 500 },
    );
  }
}
