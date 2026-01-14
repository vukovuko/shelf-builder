import { NextResponse } from "next/server";
import { db } from "@/db/db";
import { orders, user, materials, wardrobes } from "@/db/schema";
import { eq } from "drizzle-orm";
import { requireAdmin } from "@/lib/roles";
import { z } from "zod";

const orderIdSchema = z.string().uuid("Neispravan ID porudžbine");

const updateOrderSchema = z.object({
  userId: z.string().min(1).optional(),
  wardrobeId: z.string().nullable().optional(),
  materialId: z.number().int().positive().optional(),
  backMaterialId: z.number().int().positive().nullable().optional(),
  area: z.number().int().positive().optional(),
  totalPrice: z.number().int().positive().optional(),
  status: z.enum(["open", "archived", "cancelled"]).optional(),
  paymentStatus: z
    .enum([
      "unpaid",
      "pending",
      "partially_paid",
      "paid",
      "partially_refunded",
      "refunded",
      "voided",
    ])
    .optional(),
  fulfillmentStatus: z
    .enum([
      "unfulfilled",
      "in_progress",
      "on_hold",
      "scheduled",
      "partially_fulfilled",
      "fulfilled",
    ])
    .optional(),
  returnStatus: z
    .enum([
      "none",
      "return_requested",
      "return_in_progress",
      "returned",
      "inspection_complete",
    ])
    .optional(),
  notes: z.string().nullable().optional(),
});

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    await requireAdmin();

    const { id } = await params;
    const validatedId = orderIdSchema.safeParse(id);

    if (!validatedId.success) {
      return NextResponse.json(
        { error: validatedId.error.issues[0].message },
        { status: 400 },
      );
    }

    const [order] = await db
      .select({
        id: orders.id,
        userId: orders.userId,
        userName: user.name,
        userEmail: user.email,
        wardrobeId: orders.wardrobeId,
        wardrobeName: wardrobes.name,
        materialId: orders.materialId,
        materialName: materials.name,
        backMaterialId: orders.backMaterialId,
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
      .where(eq(orders.id, validatedId.data))
      .limit(1);

    if (!order) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    return NextResponse.json(order);
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === "UNAUTHORIZED") {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }
      if (error.message === "FORBIDDEN") {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
    }
    console.error("Failed to fetch order:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    await requireAdmin();

    const { id } = await params;
    const validatedId = orderIdSchema.safeParse(id);

    if (!validatedId.success) {
      return NextResponse.json(
        { error: validatedId.error.issues[0].message },
        { status: 400 },
      );
    }

    const body = await request.json();
    const validation = updateOrderSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: validation.error.issues[0].message },
        { status: 400 },
      );
    }

    const updates = validation.data;

    const [updated] = await db
      .update(orders)
      .set({
        ...updates,
        updatedAt: new Date(),
      })
      .where(eq(orders.id, validatedId.data))
      .returning();

    if (!updated) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    return NextResponse.json(updated);
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === "UNAUTHORIZED") {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }
      if (error.message === "FORBIDDEN") {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
    }
    console.error("Failed to update order:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    await requireAdmin();

    const { id } = await params;
    const validatedId = orderIdSchema.safeParse(id);

    if (!validatedId.success) {
      return NextResponse.json(
        { error: validatedId.error.issues[0].message },
        { status: 400 },
      );
    }

    const [deleted] = await db
      .delete(orders)
      .where(eq(orders.id, validatedId.data))
      .returning();

    if (!deleted) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === "UNAUTHORIZED") {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }
      if (error.message === "FORBIDDEN") {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
    }
    console.error("Failed to delete order:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
