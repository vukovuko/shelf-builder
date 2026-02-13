import { NextResponse } from "next/server";
import { db } from "@/db/db";
import { accessories, accessoryVariants } from "@/db/schema";
import { eq } from "drizzle-orm";
import { requireAdmin } from "@/lib/roles";
import { z } from "zod";

const accessoryIdSchema = z.coerce
  .number()
  .int()
  .positive("Neispravan ID dodatka");

const updateAccessorySchema = z.object({
  name: z.string().min(1).optional(),
  description: z.string().nullable().optional(),
  mainImage: z.string().nullable().optional(),
  published: z.boolean().optional(),
  pricingRule: z.enum(["none", "perDrawer", "perDoor", "fixed"]).optional(),
  qtyPerUnit: z.number().int().min(1).optional(),
});

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    await requireAdmin();

    const { id } = await params;
    const validatedId = accessoryIdSchema.safeParse(id);

    if (!validatedId.success) {
      return NextResponse.json(
        { error: validatedId.error.issues[0].message },
        { status: 400 },
      );
    }

    const [accessory] = await db
      .select()
      .from(accessories)
      .where(eq(accessories.id, validatedId.data));

    if (!accessory) {
      return NextResponse.json(
        { error: "Accessory not found" },
        { status: 404 },
      );
    }

    const variants = await db
      .select()
      .from(accessoryVariants)
      .where(eq(accessoryVariants.accessoryId, accessory.id));

    return NextResponse.json({ ...accessory, variants });
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === "UNAUTHORIZED") {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }
      if (error.message === "FORBIDDEN") {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
    }
    console.error("Failed to fetch accessory:", error);
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
    const validatedId = accessoryIdSchema.safeParse(id);

    if (!validatedId.success) {
      return NextResponse.json(
        { error: validatedId.error.issues[0].message },
        { status: 400 },
      );
    }

    const body = await request.json();
    const validation = updateAccessorySchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: validation.error.issues[0].message },
        { status: 400 },
      );
    }

    const updates = validation.data;

    const [updated] = await db
      .update(accessories)
      .set({
        ...updates,
        updatedAt: new Date(),
      })
      .where(eq(accessories.id, validatedId.data))
      .returning();

    if (!updated) {
      return NextResponse.json(
        { error: "Accessory not found" },
        { status: 404 },
      );
    }

    const variants = await db
      .select()
      .from(accessoryVariants)
      .where(eq(accessoryVariants.accessoryId, updated.id));

    return NextResponse.json({ ...updated, variants });
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === "UNAUTHORIZED") {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }
      if (error.message === "FORBIDDEN") {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
    }
    console.error("Failed to update accessory:", error);
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
    const validatedId = accessoryIdSchema.safeParse(id);

    if (!validatedId.success) {
      return NextResponse.json(
        { error: validatedId.error.issues[0].message },
        { status: 400 },
      );
    }

    // Variants will be cascade deleted due to FK constraint
    const [deleted] = await db
      .delete(accessories)
      .where(eq(accessories.id, validatedId.data))
      .returning();

    if (!deleted) {
      return NextResponse.json(
        { error: "Accessory not found" },
        { status: 404 },
      );
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
    console.error("Failed to delete accessory:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
