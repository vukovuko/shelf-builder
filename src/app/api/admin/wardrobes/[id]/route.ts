import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db/db";
import { wardrobes } from "@/db/schema";
import { eq } from "drizzle-orm";
import { requireAdmin } from "@/lib/roles";
import { z } from "zod";

const wardrobeIdSchema = z.string().uuid("Neispravan ID ormana");

const updateWardrobeSchema = z.object({
  publishedModel: z.boolean().optional(),
  isModel: z.boolean().optional(),
});

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    await requireAdmin();

    const { id } = await params;

    const validatedId = wardrobeIdSchema.safeParse(id);
    if (!validatedId.success) {
      return NextResponse.json(
        { error: validatedId.error.issues[0].message },
        { status: 400 },
      );
    }

    const body = await request.json();
    const validatedBody = updateWardrobeSchema.safeParse(body);
    if (!validatedBody.success) {
      return NextResponse.json(
        { error: validatedBody.error.issues[0].message },
        { status: 400 },
      );
    }

    // Check if wardrobe exists
    const [existingWardrobe] = await db
      .select({ id: wardrobes.id })
      .from(wardrobes)
      .where(eq(wardrobes.id, validatedId.data));

    if (!existingWardrobe) {
      return NextResponse.json(
        { error: "Orman nije pronađen" },
        { status: 404 },
      );
    }

    // Update wardrobe
    await db
      .update(wardrobes)
      .set({
        ...validatedBody.data,
        updatedAt: new Date(),
      })
      .where(eq(wardrobes.id, validatedId.data));

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
    console.error("Failed to update wardrobe:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    await requireAdmin();

    const { id } = await params;

    const validatedId = wardrobeIdSchema.safeParse(id);
    if (!validatedId.success) {
      return NextResponse.json(
        { error: validatedId.error.issues[0].message },
        { status: 400 },
      );
    }

    // Check if wardrobe exists
    const [existingWardrobe] = await db
      .select({ id: wardrobes.id })
      .from(wardrobes)
      .where(eq(wardrobes.id, validatedId.data));

    if (!existingWardrobe) {
      return NextResponse.json(
        { error: "Orman nije pronađen" },
        { status: 404 },
      );
    }

    // Delete wardrobe
    await db.delete(wardrobes).where(eq(wardrobes.id, validatedId.data));

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
    console.error("Failed to delete wardrobe:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
