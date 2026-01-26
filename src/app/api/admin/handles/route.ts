import { NextResponse } from "next/server";
import { db } from "@/db/db";
import { handles, handleFinishes } from "@/db/schema";
import { desc, eq } from "drizzle-orm";
import { requireAdmin } from "@/lib/roles";
import { z } from "zod";

const createHandleSchema = z.object({
  name: z.string().min(1, "Naziv je obavezan"),
  legacyId: z.string().optional(),
  description: z.string().optional(),
  mainImage: z.string().optional(),
  published: z.boolean().optional(),
});

export async function GET() {
  try {
    await requireAdmin();

    // Fetch handles with their finishes
    const allHandles = await db
      .select()
      .from(handles)
      .orderBy(desc(handles.createdAt));

    // Fetch finishes for each handle
    const handlesWithFinishes = await Promise.all(
      allHandles.map(async (handle) => {
        const finishes = await db
          .select()
          .from(handleFinishes)
          .where(eq(handleFinishes.handleId, handle.id));
        return { ...handle, finishes };
      }),
    );

    return NextResponse.json(handlesWithFinishes);
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === "UNAUTHORIZED") {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }
      if (error.message === "FORBIDDEN") {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
    }
    console.error("Failed to fetch handles:", error);
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
    const validation = createHandleSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: validation.error.issues[0].message },
        { status: 400 },
      );
    }

    const { name, legacyId, description, mainImage, published } =
      validation.data;

    const [created] = await db
      .insert(handles)
      .values({
        name,
        legacyId: legacyId || null,
        description: description || null,
        mainImage: mainImage || null,
        published: published ?? false,
      })
      .returning();

    return NextResponse.json({ ...created, finishes: [] }, { status: 201 });
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === "UNAUTHORIZED") {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }
      if (error.message === "FORBIDDEN") {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
    }
    console.error("Failed to create handle:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
