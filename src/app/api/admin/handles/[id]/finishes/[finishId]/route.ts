import { NextResponse } from "next/server";
import { db } from "@/db/db";
import { handleFinishes } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { requireAdmin } from "@/lib/roles";
import { z } from "zod";

const idSchema = z.coerce.number().int().positive("Neispravan ID");

const updateFinishSchema = z.object({
  name: z.string().min(1).optional(),
  legacyId: z.string().nullable().optional(),
  image: z.string().nullable().optional(),
  price: z.number().int().nonnegative().optional(),
  costPrice: z.number().int().nonnegative().optional(),
});

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string; finishId: string }> },
) {
  try {
    await requireAdmin();

    const { id, finishId } = await params;
    const validatedHandleId = idSchema.safeParse(id);
    const validatedFinishId = idSchema.safeParse(finishId);

    if (!validatedHandleId.success) {
      return NextResponse.json(
        { error: validatedHandleId.error.issues[0].message },
        { status: 400 },
      );
    }

    if (!validatedFinishId.success) {
      return NextResponse.json(
        { error: validatedFinishId.error.issues[0].message },
        { status: 400 },
      );
    }

    const body = await request.json();
    const validation = updateFinishSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: validation.error.issues[0].message },
        { status: 400 },
      );
    }

    const updates = validation.data;

    const [updated] = await db
      .update(handleFinishes)
      .set({
        ...updates,
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(handleFinishes.id, validatedFinishId.data),
          eq(handleFinishes.handleId, validatedHandleId.data),
        ),
      )
      .returning();

    if (!updated) {
      return NextResponse.json({ error: "Finish not found" }, { status: 404 });
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
    console.error("Failed to update finish:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string; finishId: string }> },
) {
  try {
    await requireAdmin();

    const { id, finishId } = await params;
    const validatedHandleId = idSchema.safeParse(id);
    const validatedFinishId = idSchema.safeParse(finishId);

    if (!validatedHandleId.success) {
      return NextResponse.json(
        { error: validatedHandleId.error.issues[0].message },
        { status: 400 },
      );
    }

    if (!validatedFinishId.success) {
      return NextResponse.json(
        { error: validatedFinishId.error.issues[0].message },
        { status: 400 },
      );
    }

    const [deleted] = await db
      .delete(handleFinishes)
      .where(
        and(
          eq(handleFinishes.id, validatedFinishId.data),
          eq(handleFinishes.handleId, validatedHandleId.data),
        ),
      )
      .returning();

    if (!deleted) {
      return NextResponse.json({ error: "Finish not found" }, { status: 404 });
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
    console.error("Failed to delete finish:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
