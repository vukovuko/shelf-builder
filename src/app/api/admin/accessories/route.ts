import { NextResponse } from "next/server";
import { db } from "@/db/db";
import { accessories, accessoryVariants } from "@/db/schema";
import { desc, eq } from "drizzle-orm";
import { requireAdmin } from "@/lib/roles";
import { z } from "zod";

const createAccessorySchema = z.object({
  name: z.string().min(1, "Naziv je obavezan"),
  description: z.string().optional(),
  mainImage: z.string().optional(),
  published: z.boolean().optional(),
});

export async function GET() {
  try {
    await requireAdmin();

    const allAccessories = await db
      .select()
      .from(accessories)
      .orderBy(desc(accessories.createdAt));

    const accessoriesWithVariants = await Promise.all(
      allAccessories.map(async (accessory) => {
        const variants = await db
          .select()
          .from(accessoryVariants)
          .where(eq(accessoryVariants.accessoryId, accessory.id));
        return { ...accessory, variants };
      }),
    );

    return NextResponse.json(accessoriesWithVariants);
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === "UNAUTHORIZED") {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }
      if (error.message === "FORBIDDEN") {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
    }
    console.error("Failed to fetch accessories:", error);
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
    const validation = createAccessorySchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: validation.error.issues[0].message },
        { status: 400 },
      );
    }

    const { name, description, mainImage, published } = validation.data;

    const [created] = await db
      .insert(accessories)
      .values({
        name,
        description: description || null,
        mainImage: mainImage || null,
        published: published ?? false,
      })
      .returning();

    return NextResponse.json({ ...created, variants: [] }, { status: 201 });
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === "UNAUTHORIZED") {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }
      if (error.message === "FORBIDDEN") {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
    }
    console.error("Failed to create accessory:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
