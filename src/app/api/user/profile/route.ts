import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { db } from "@/db/db";
import { user } from "@/db/schema";

export async function GET() {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session?.user) {
      return NextResponse.json(null, { status: 401 });
    }

    const [userData] = await db
      .select({
        name: user.name,
        email: user.email,
        phone: user.phone,
        shippingStreet: user.shippingStreet,
        shippingApartment: user.shippingApartment,
        shippingCity: user.shippingCity,
        shippingPostalCode: user.shippingPostalCode,
        receiveNewsletter: user.receiveNewsletter,
      })
      .from(user)
      .where(eq(user.id, session.user.id));

    return NextResponse.json(userData || null);
  } catch (error) {
    console.error("Failed to fetch user profile:", error);
    return NextResponse.json(null, { status: 500 });
  }
}

const updateSchema = z.object({
  receiveNewsletter: z.boolean(),
});

export async function PUT(request: Request) {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const validation = updateSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: validation.error.issues[0].message },
        { status: 400 },
      );
    }

    await db
      .update(user)
      .set({
        receiveNewsletter: validation.data.receiveNewsletter,
        updatedAt: new Date(),
      })
      .where(eq(user.id, session.user.id));

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to update profile:", error);
    return NextResponse.json(
      { error: "Greška pri ažuriranju profila" },
      { status: 500 },
    );
  }
}
