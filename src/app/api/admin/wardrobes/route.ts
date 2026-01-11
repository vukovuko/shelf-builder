import { NextResponse } from "next/server";
import { db } from "@/db/db";
import { user, wardrobes } from "@/db/schema";
import { desc, eq } from "drizzle-orm";
import { requireAdmin } from "@/lib/roles";

export async function GET() {
  try {
    await requireAdmin();

    // Fetch all wardrobes with user info
    const allWardrobes = await db
      .select({
        id: wardrobes.id,
        name: wardrobes.name,
        thumbnail: wardrobes.thumbnail,
        createdAt: wardrobes.createdAt,
        updatedAt: wardrobes.updatedAt,
        userId: wardrobes.userId,
        userName: user.name,
        userEmail: user.email,
      })
      .from(wardrobes)
      .leftJoin(user, eq(wardrobes.userId, user.id))
      .orderBy(desc(wardrobes.createdAt));

    return NextResponse.json(allWardrobes);
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === "UNAUTHORIZED") {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }
      if (error.message === "FORBIDDEN") {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
    }
    console.error("Failed to fetch wardrobes:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
