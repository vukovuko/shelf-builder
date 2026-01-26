import { NextResponse } from "next/server";
import { db } from "@/db/db";
import { handles, handleFinishes } from "@/db/schema";
import { eq } from "drizzle-orm";

// Public API - returns only published handles with their finishes
export async function GET() {
  try {
    // Fetch only published handles
    const publishedHandles = await db
      .select()
      .from(handles)
      .where(eq(handles.published, true));

    // Fetch finishes for each handle
    const handlesWithFinishes = await Promise.all(
      publishedHandles.map(async (handle) => {
        const finishes = await db
          .select()
          .from(handleFinishes)
          .where(eq(handleFinishes.handleId, handle.id));
        return { ...handle, finishes };
      }),
    );

    return NextResponse.json(handlesWithFinishes);
  } catch (error) {
    console.error("Failed to fetch handles:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
