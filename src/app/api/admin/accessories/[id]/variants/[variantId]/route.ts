import { NextResponse } from "next/server";
import { db } from "@/db/db";
import { accessoryVariants } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { requireAdmin } from "@/lib/roles";
import { z } from "zod";

const idSchema = z.coerce.number().int().positive("Neispravan ID");

const updateVariantSchema = z.object({
  name: z.string().min(1).optional(),
  image: z.string().nullable().optional(),
  price: z.number().int().nonnegative().optional(),
  costPrice: z.number().int().nonnegative().optional(),
});

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string; variantId: string }> },
) {
  try {
    await requireAdmin();

    const { id, variantId } = await params;
    const validatedAccessoryId = idSchema.safeParse(id);
    const validatedVariantId = idSchema.safeParse(variantId);

    if (!validatedAccessoryId.success) {
      return NextResponse.json(
        { error: validatedAccessoryId.error.issues[0].message },
        { status: 400 },
      );
    }

    if (!validatedVariantId.success) {
      return NextResponse.json(
        { error: validatedVariantId.error.issues[0].message },
        { status: 400 },
      );
    }

    const body = await request.json();
    const validation = updateVariantSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: validation.error.issues[0].message },
        { status: 400 },
      );
    }

    const updates = validation.data;

    const [updated] = await db
      .update(accessoryVariants)
      .set({
        ...updates,
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(accessoryVariants.id, validatedVariantId.data),
          eq(accessoryVariants.accessoryId, validatedAccessoryId.data),
        ),
      )
      .returning();

    if (!updated) {
      return NextResponse.json({ error: "Variant not found" }, { status: 404 });
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
    console.error("Failed to update variant:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string; variantId: string }> },
) {
  try {
    await requireAdmin();

    const { id, variantId } = await params;
    const validatedAccessoryId = idSchema.safeParse(id);
    const validatedVariantId = idSchema.safeParse(variantId);

    if (!validatedAccessoryId.success) {
      return NextResponse.json(
        { error: validatedAccessoryId.error.issues[0].message },
        { status: 400 },
      );
    }

    if (!validatedVariantId.success) {
      return NextResponse.json(
        { error: validatedVariantId.error.issues[0].message },
        { status: 400 },
      );
    }

    const [deleted] = await db
      .delete(accessoryVariants)
      .where(
        and(
          eq(accessoryVariants.id, validatedVariantId.data),
          eq(accessoryVariants.accessoryId, validatedAccessoryId.data),
        ),
      )
      .returning();

    if (!deleted) {
      return NextResponse.json({ error: "Variant not found" }, { status: 404 });
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
    console.error("Failed to delete variant:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
