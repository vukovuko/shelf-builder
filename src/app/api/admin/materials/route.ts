import { NextResponse } from "next/server";
import { db } from "@/db/db";
import { materials } from "@/db/schema";
import { desc } from "drizzle-orm";
import { requireAdmin } from "@/lib/roles";
import { z } from "zod";

const createMaterialSchema = z.object({
  name: z.string().min(1, "Naziv je obavezan"),
  productCode: z.string().optional(),
  price: z.number().int().positive("Cena mora biti pozitivan broj"),
  costPrice: z.number().int().nonnegative().optional().default(0),
  categories: z.array(z.string()).min(1, "Kategorija je obavezna"),
  img: z.string().optional(),
  thickness: z.number().int().positive().optional(),
  stock: z.number().int().min(0).optional(),
  published: z.boolean().optional(),
});

export async function GET() {
  try {
    await requireAdmin();

    const allMaterials = await db
      .select()
      .from(materials)
      .orderBy(desc(materials.createdAt));

    return NextResponse.json(allMaterials);
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === "UNAUTHORIZED") {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }
      if (error.message === "FORBIDDEN") {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
    }
    console.error("Failed to fetch materials:", error);
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
    const validation = createMaterialSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: validation.error.issues[0].message },
        { status: 400 },
      );
    }

    const {
      name,
      productCode,
      price,
      costPrice,
      categories,
      img,
      thickness,
      stock,
      published,
    } = validation.data;

    const [created] = await db
      .insert(materials)
      .values({
        name,
        productCode: productCode || null,
        price,
        costPrice,
        categories,
        img: img || null,
        thickness: thickness || null,
        stock: stock ?? 0,
        published: published ?? false,
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
    console.error("Failed to create material:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
