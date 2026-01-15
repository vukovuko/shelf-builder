import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { eq } from "drizzle-orm";
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
      })
      .from(user)
      .where(eq(user.id, session.user.id));

    return NextResponse.json(userData || null);
  } catch (error) {
    console.error("Failed to fetch user profile:", error);
    return NextResponse.json(null, { status: 500 });
  }
}
