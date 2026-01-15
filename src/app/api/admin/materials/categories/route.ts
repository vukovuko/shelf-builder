import { NextResponse } from "next/server";
import { db } from "@/db/db";
import { materials } from "@/db/schema";
import { requireAdmin } from "@/lib/roles";

export async function GET() {
  try {
    await requireAdmin();

    // Get all materials and extract unique categories from arrays
    const allMaterials = await db.select({ categories: materials.categories }).from(materials);

    // Flatten all categories arrays and get unique values
    const allCategories = allMaterials.flatMap((m) => m.categories);
    const uniqueCategories = [...new Set(allCategories)].sort();

    return NextResponse.json(uniqueCategories);
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === "UNAUTHORIZED") {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }
      if (error.message === "FORBIDDEN") {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
    }
    console.error("Failed to fetch categories:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
