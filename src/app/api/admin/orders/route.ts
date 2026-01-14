import { NextResponse } from "next/server";
import { db } from "@/db/db";
import { orders, user, materials, wardrobes } from "@/db/schema";
import { desc, eq } from "drizzle-orm";
import { requireAdmin } from "@/lib/roles";
import { z } from "zod";

const createOrderSchema = z.object({
  userId: z.string().min(1, "Korisnik je obavezan"),
  wardrobeId: z.string().nullable().optional(),
  materialId: z.number().int().positive("Materijal je obavezan"),
  backMaterialId: z.number().int().positive().nullable().optional(),
  area: z.number().int().positive("Kvadratura mora biti pozitivan broj"),
  totalPrice: z.number().int().positive("Cena mora biti pozitivan broj"),
  notes: z.string().nullable().optional(),
  customerName: z.string().min(1, "Ime kupca je obavezno"),
  customerEmail: z.string().email().nullable().optional(),
  customerPhone: z.string().nullable().optional(),
  shippingStreet: z.string().min(1, "Ulica je obavezna"),
  shippingCity: z.string().min(1, "Grad je obavezan"),
  shippingPostalCode: z.string().min(1, "Poštanski broj je obavezan"),
});

export async function GET() {
  try {
    await requireAdmin();

    const allOrders = await db
      .select({
        id: orders.id,
        userId: orders.userId,
        userName: user.name,
        userEmail: user.email,
        wardrobeId: orders.wardrobeId,
        wardrobeName: wardrobes.name,
        materialId: orders.materialId,
        materialName: materials.name,
        area: orders.area,
        totalPrice: orders.totalPrice,
        status: orders.status,
        paymentStatus: orders.paymentStatus,
        fulfillmentStatus: orders.fulfillmentStatus,
        returnStatus: orders.returnStatus,
        notes: orders.notes,
        createdAt: orders.createdAt,
        updatedAt: orders.updatedAt,
      })
      .from(orders)
      .leftJoin(user, eq(orders.userId, user.id))
      .leftJoin(wardrobes, eq(orders.wardrobeId, wardrobes.id))
      .leftJoin(materials, eq(orders.materialId, materials.id))
      .orderBy(desc(orders.createdAt));

    return NextResponse.json(allOrders);
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === "UNAUTHORIZED") {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }
      if (error.message === "FORBIDDEN") {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
    }
    console.error("Failed to fetch orders:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  try {
    await requireAdmin();

    const body = await request.json();
    const validation = createOrderSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: validation.error.issues[0].message },
        { status: 400 },
      );
    }

    const {
      userId,
      wardrobeId,
      materialId,
      backMaterialId,
      area,
      totalPrice,
      notes,
      customerName,
      customerEmail,
      customerPhone,
      shippingStreet,
      shippingCity,
      shippingPostalCode,
    } = validation.data;

    const [created] = await db
      .insert(orders)
      .values({
        userId,
        wardrobeId: wardrobeId || null,
        materialId,
        backMaterialId: backMaterialId || null,
        area,
        totalPrice,
        notes: notes || null,
        customerName,
        customerEmail: customerEmail || null,
        customerPhone: customerPhone || null,
        shippingStreet,
        shippingCity,
        shippingPostalCode,
      })
      .returning();

    return NextResponse.json(created, { status: 201 });
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === "UNAUTHORIZED") {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }
      if (error.message === "FORBIDDEN") {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
    }
    console.error("Failed to create order:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
