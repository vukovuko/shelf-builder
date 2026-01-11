import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db/db";
import { user, wardrobes } from "@/db/schema";
import { eq, count } from "drizzle-orm";
import { requireAdmin } from "@/lib/roles";
import { userIdSchema } from "@/lib/validation";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    await requireAdmin();

    const { id } = await params;

    const validatedId = userIdSchema.safeParse(id);
    if (!validatedId.success) {
      return NextResponse.json(
        { error: validatedId.error.issues[0].message },
        { status: 400 },
      );
    }

    // Fetch user
    const [userData] = await db
      .select({
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
      })
      .from(user)
      .where(eq(user.id, validatedId.data));

    if (!userData) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Fetch wardrobe count
    const [wardrobeCount] = await db
      .select({ count: count() })
      .from(wardrobes)
      .where(eq(wardrobes.userId, validatedId.data));

    // Fetch user's wardrobes
    const userWardrobes = await db
      .select({
        id: wardrobes.id,
        name: wardrobes.name,
        createdAt: wardrobes.createdAt,
        updatedAt: wardrobes.updatedAt,
      })
      .from(wardrobes)
      .where(eq(wardrobes.userId, validatedId.data));

    return NextResponse.json({
      ...userData,
      wardrobeCount: wardrobeCount?.count ?? 0,
      wardrobes: userWardrobes,
    });
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === "UNAUTHORIZED") {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }
      if (error.message === "FORBIDDEN") {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
    }
    console.error("Failed to fetch user:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
