import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/db/db";
import { user, account, orders } from "@/db/schema";
import { eq, and, desc } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { hashPassword } from "better-auth/crypto";
import {
  strictRateLimit,
  getIdentifier,
  rateLimitResponse,
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
  name: z.string().min(1, "Ime je obavezno"),
});

export async function POST(request: Request) {
  try {
    // Rate limit - 5 signup attempts per minute per IP
    const identifier = getIdentifier(request);
    const { success, reset } = await strictRateLimit.limit(identifier);
    if (!success) {
      return rateLimitResponse(reset);
    }

    const body = await request.json();
    const validation = signupSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: validation.error.issues[0].message },
        { status: 400 },
      );
    }

    const { email, password, name } = validation.data;

    // Check if user with this email exists
    const [existingUser] = await db
      .select({
        id: user.id,
        name: user.name,
        emailVerified: user.emailVerified,
      })
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

      // User exists but no credential account - create one
      try {
        // Hash password using Better Auth's method
        const hashedPassword = await hashPassword(password);

        // Create credential account for existing user
        const accountId = crypto.randomUUID();
        const now = new Date();

        await db.insert(account).values({
          id: accountId,
          accountId: existingUser.id, // For credential provider, accountId = userId
          providerId: "credential",
          userId: existingUser.id,
          accessToken: null,
          refreshToken: null,
          idToken: null,
          accessTokenExpiresAt: null,
          refreshTokenExpiresAt: null,
          scope: null,
          password: hashedPassword,
          createdAt: now,
          updatedAt: now,
        });

        // Update user name if they provided a different one
        if (name !== existingUser.name) {
          await db
            .update(user)
            .set({ name, updatedAt: now })
            .where(eq(user.id, existingUser.id));
        }

        // Copy shipping address from most recent order if user doesn't have one
        await copyShippingAddressFromOrders(existingUser.id, email);

        // Sign in the user using Better Auth
        const signInResult = await auth.api.signInEmail({
          body: { email, password },
          headers: await headers(),
        });

        // Send verification email only if not already verified
        if (!existingUser.emailVerified) {
          try {
            await auth.api.sendVerificationEmail({
              body: { email },
              headers: await headers(),
            });
          } catch (emailError) {
            // Non-critical - log but don't fail registration
            console.error("Failed to send verification email:", emailError);
          }
        }

        return NextResponse.json({
          success: true,
          message: "Nalog uspešno kreiran",
          linked: true, // Indicates we linked to existing user
          user: signInResult.user,
        });
      } catch (linkError) {
        console.error("Failed to link account:", linkError);
        return NextResponse.json(
          { error: "Greška pri kreiranju naloga" },
          { status: 500 },
        );
      }
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

      return NextResponse.json({
        success: true,
        message: "Nalog uspešno kreiran",
        linked: false,
        user: result.user,
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
