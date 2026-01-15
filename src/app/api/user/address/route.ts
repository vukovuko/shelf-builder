import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { db } from "@/db/db";
import { user } from "@/db/schema";

const addressSchema = z.object({
  shippingStreet: z.string().min(1, "Ulica je obavezna"),
  shippingApartment: z.string().optional().or(z.literal("")),
  shippingCity: z.string().min(1, "Grad je obavezan"),
  shippingPostalCode: z.string().min(1, "Poštanski broj je obavezan"),
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
    const validation = addressSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: validation.error.issues[0].message },
        { status: 400 },
      );
    }

    const {
      shippingStreet,
      shippingApartment,
      shippingCity,
      shippingPostalCode,
    } = validation.data;

    await db
      .update(user)
      .set({
        shippingStreet,
        shippingApartment: shippingApartment || null,
        shippingCity,
        shippingPostalCode,
        updatedAt: new Date(),
      })
      .where(eq(user.id, session.user.id));

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to update address:", error);
    return NextResponse.json(
      { error: "Greška pri čuvanju adrese" },
      { status: 500 },
    );
  }
}
