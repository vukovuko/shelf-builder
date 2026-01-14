import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { db } from "@/db/db";
import { user } from "@/db/schema";
import { eq } from "drizzle-orm";
import { requireAdmin } from "@/lib/roles";

const createUserSchema = z
  .object({
    name: z.string().min(1, "Ime je obavezno"),
    email: z
      .string()
      .email("Neispravan email format")
      .optional()
      .or(z.literal("")),
    phone: z
      .string()
      .min(6, "Telefon mora imati najmanje 6 cifara")
      .optional()
      .or(z.literal("")),
    role: z.enum(["user", "admin"]).default("user"),
  })
  .refine((data) => data.email || data.phone, {
    message: "Morate uneti email ili telefon",
  });

export async function POST(request: Request) {
  try {
    await requireAdmin();

    const body = await request.json();
    const validation = createUserSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: validation.error.issues[0].message },
        { status: 400 },
      );
    }

    const { name, email, phone, role } = validation.data;
    const hasRealEmail = email && email.length > 0;

    if (hasRealEmail) {
      // ===== USER WITH EMAIL =====
      // Use Better Auth API + send password reset email

      // Check if email already exists
      const [existing] = await db
        .select({ id: user.id })
        .from(user)
        .where(eq(user.email, email));

      if (existing) {
        return NextResponse.json(
          { error: "Korisnik sa ovim emailom vec postoji" },
          { status: 400 },
        );
      }

      // Generate a random temporary password (user will reset it)
      const tempPassword = crypto.randomUUID() + "Aa1!";

      // Create user via Better Auth admin API
      const createResult = await auth.api.createUser({
        body: {
          name,
          email,
          password: tempPassword,
          role,
          data: phone ? { phone } : undefined,
        },
      });

      if (!createResult || !createResult.user) {
        throw new Error("Greska pri kreiranju korisnika");
      }

      // Send password reset email so user can set their own password
      await auth.api.requestPasswordReset({
        body: {
          email,
          redirectTo: "/reset-password",
        },
      });

      return NextResponse.json(
        {
          success: true,
          user: {
            id: createResult.user.id,
            name: createResult.user.name,
            email: createResult.user.email,
            phone: phone || null,
            role: createResult.user.role,
          },
          message: "Korisnik kreiran. Email za postavljanje lozinke je poslat.",
        },
        { status: 201 },
      );
    } else {
      // ===== PHONE-ONLY USER =====
      // Insert directly into database, no account record, no emails

      // Generate internal placeholder email
      const sanitizedPhone = phone!.replace(/[^0-9]/g, "");
      const internalEmail = `phone.${sanitizedPhone}@internal.local`;

      // Check if phone already exists
      const [existingByPhone] = await db
        .select({ id: user.id })
        .from(user)
        .where(eq(user.phone, phone!));

      if (existingByPhone) {
        return NextResponse.json(
          { error: "Korisnik sa ovim telefonom vec postoji" },
          { status: 400 },
        );
      }

      // Check if internal email already exists (shouldn't happen, but safety check)
      const [existingByEmail] = await db
        .select({ id: user.id })
        .from(user)
        .where(eq(user.email, internalEmail));

      if (existingByEmail) {
        return NextResponse.json(
          { error: "Korisnik sa ovim telefonom vec postoji" },
          { status: 400 },
        );
      }

      // Insert directly - no account record means they can't log in
      const userId = crypto.randomUUID();
      const now = new Date();

      await db.insert(user).values({
        id: userId,
        name,
        email: internalEmail,
        phone: phone!,
        emailVerified: false,
        role,
        createdAt: now,
        updatedAt: now,
      });

      return NextResponse.json(
        {
          success: true,
          user: {
            id: userId,
            name,
            email: internalEmail,
            phone: phone!,
            role,
          },
          message: "Korisnik kreiran (samo telefon - bez mogucnosti prijave).",
        },
        { status: 201 },
      );
    }
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === "UNAUTHORIZED") {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }
      if (error.message === "FORBIDDEN") {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
      if (
        error.message.includes("unique") ||
        error.message.includes("duplicate")
      ) {
        return NextResponse.json(
          { error: "Korisnik sa ovim podacima vec postoji" },
          { status: 400 },
        );
      }
    }
    console.error("Failed to create user:", error);
    return NextResponse.json(
      { error: "Greska pri kreiranju korisnika" },
      { status: 500 },
    );
  }
}
