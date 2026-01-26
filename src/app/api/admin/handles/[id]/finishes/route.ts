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

const createFinishSchema = z.object({
  name: z.string().min(1, "Naziv završne obrade je obavezan"),
  legacyId: z.string().optional(),
  image: z.string().optional(),
  price: z.number().int().nonnegative("Cena mora biti pozitivna"),
  costPrice: z.number().int().nonnegative().optional(),
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

    // Verify handle exists
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
      .where(eq(handleFinishes.handleId, validatedId.data));

    return NextResponse.json(finishes);
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === "UNAUTHORIZED") {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }
      if (error.message === "FORBIDDEN") {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
    }
    console.error("Failed to fetch finishes:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

export async function POST(
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

    // Verify handle exists
    const [handle] = await db
      .select()
      .from(handles)
      .where(eq(handles.id, validatedId.data));

    if (!handle) {
      return NextResponse.json({ error: "Handle not found" }, { status: 404 });
    }

    const body = await request.json();
    const validation = createFinishSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: validation.error.issues[0].message },
        { status: 400 },
      );
    }

    const { name, legacyId, image, price, costPrice } = validation.data;

    const [created] = await db
      .insert(handleFinishes)
      .values({
        handleId: validatedId.data,
        name,
        legacyId: legacyId || null,
        image: image || null,
        price,
        costPrice: costPrice ?? 0,
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
    console.error("Failed to create finish:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
