import { NextResponse } from "next/server";
import { db } from "@/db/db";
import { materials } from "@/db/schema";
import { requireAdmin } from "@/lib/roles";

export async function GET() {
  try {
    await requireAdmin();

    // Get distinct categories
    const result = await db
      .selectDistinct({ category: materials.category })
      .from(materials)
      .orderBy(materials.category);

    const categories = result.map((r) => r.category);

    return NextResponse.json(categories);
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
