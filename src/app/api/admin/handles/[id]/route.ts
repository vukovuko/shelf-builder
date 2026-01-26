import { NextResponse } from "next/server";
import { db } from "@/db/db";
import { handles, handleFinishes } from "@/db/schema";
import { eq } from "drizzle-orm";
import { requireAdmin } from "@/lib/roles";
import { z } from "zod";

const handleIdSchema = z.coerce
  .number()
  .int()
  .positive("Neispravan ID ručke");

const updateHandleSchema = z.object({
  name: z.string().min(1).optional(),
  legacyId: z.string().nullable().optional(),
  description: z.string().nullable().optional(),
  mainImage: z.string().nullable().optional(),
  published: z.boolean().optional(),
});

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    await requireAdmin();

    const { id } = await params;
    const validatedId = handleIdSchema.safeParse(id);

    if (!validatedId.success) {
      return NextResponse.json(
        { error: validatedId.error.issues[0].message },
        { status: 400 },
      );
    }

    const [handle] = await db
      .select()
      .from(handles)
      .where(eq(handles.id, validatedId.data));

    if (!handle) {
      return NextResponse.json({ error: "Handle not found" }, { status: 404 });
    }

    // Fetch finishes for this handle
    const finishes = await db
      .select()
      .from(handleFinishes)
      .where(eq(handleFinishes.handleId, handle.id));

    return NextResponse.json({ ...handle, finishes });
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === "UNAUTHORIZED") {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }
      if (error.message === "FORBIDDEN") {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
    }
    console.error("Failed to fetch handle:", error);
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
    const validatedId = handleIdSchema.safeParse(id);

    if (!validatedId.success) {
      return NextResponse.json(
        { error: validatedId.error.issues[0].message },
        { status: 400 },
      );
    }

    const body = await request.json();
    const validation = updateHandleSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: validation.error.issues[0].message },
        { status: 400 },
      );
    }

    const updates = validation.data;

    const [updated] = await db
      .update(handles)
      .set({
        ...updates,
        updatedAt: new Date(),
      })
      .where(eq(handles.id, validatedId.data))
      .returning();

    if (!updated) {
      return NextResponse.json({ error: "Handle not found" }, { status: 404 });
    }

    // Fetch finishes for this handle
    const finishes = await db
      .select()
      .from(handleFinishes)
      .where(eq(handleFinishes.handleId, updated.id));

    return NextResponse.json({ ...updated, finishes });
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === "UNAUTHORIZED") {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }
      if (error.message === "FORBIDDEN") {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
    }
    console.error("Failed to update handle:", error);
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
    const validatedId = handleIdSchema.safeParse(id);

    if (!validatedId.success) {
      return NextResponse.json(
        { error: validatedId.error.issues[0].message },
        { status: 400 },
      );
    }

    // Finishes will be cascade deleted due to FK constraint
    const [deleted] = await db
      .delete(handles)
      .where(eq(handles.id, validatedId.data))
      .returning();

    if (!deleted) {
      return NextResponse.json({ error: "Handle not found" }, { status: 404 });
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
    console.error("Failed to delete handle:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
