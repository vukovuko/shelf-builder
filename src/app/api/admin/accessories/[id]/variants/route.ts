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

const createVariantSchema = z.object({
  name: z.string().min(1, "Naziv varijante je obavezan"),
  image: z.string().nullable().optional(),
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
    const validatedId = accessoryIdSchema.safeParse(id);

    if (!validatedId.success) {
      return NextResponse.json(
        { error: validatedId.error.issues[0].message },
        { status: 400 },
      );
    }

    // Verify accessory exists
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
      .where(eq(accessoryVariants.accessoryId, validatedId.data));

    return NextResponse.json(variants);
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === "UNAUTHORIZED") {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }
      if (error.message === "FORBIDDEN") {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
    }
    console.error("Failed to fetch variants:", error);
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
    const validatedId = accessoryIdSchema.safeParse(id);

    if (!validatedId.success) {
      return NextResponse.json(
        { error: validatedId.error.issues[0].message },
        { status: 400 },
      );
    }

    // Verify accessory exists
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

    const body = await request.json();
    const validation = createVariantSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: validation.error.issues[0].message },
        { status: 400 },
      );
    }

    const { name, image, price, costPrice } = validation.data;

    const [created] = await db
      .insert(accessoryVariants)
      .values({
        accessoryId: validatedId.data,
        name,
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
    console.error("Failed to create variant:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
