import { NextResponse } from "next/server";
import { db } from "@/db/db";
import { user, wardrobes } from "@/db/schema";
import { count, eq } from "drizzle-orm";
import { requireAdmin } from "@/lib/roles";

export async function GET() {
  try {
    // Check admin access
    await requireAdmin();

    // Get stats
    const [totalUsersResult, totalWardrobesResult, adminCountResult] =
      await Promise.all([
        db.select({ count: count() }).from(user),
        db.select({ count: count() }).from(wardrobes),
        db.select({ count: count() }).from(user).where(eq(user.role, "admin")),
      ]);

    return NextResponse.json({
      totalUsers: totalUsersResult[0]?.count ?? 0,
      totalWardrobes: totalWardrobesResult[0]?.count ?? 0,
      adminCount: adminCountResult[0]?.count ?? 0,
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
    console.error("Failed to fetch stats:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
