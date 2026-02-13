import { NextResponse } from "next/server";
import { db } from "@/db/db";
import { accessories, accessoryVariants } from "@/db/schema";
import { eq } from "drizzle-orm";

// Public API - returns only published accessories with their variants
export async function GET() {
  try {
    const publishedAccessories = await db
      .select()
      .from(accessories)
      .where(eq(accessories.published, true));

    const accessoriesWithVariants = await Promise.all(
      publishedAccessories.map(async (accessory) => {
        const variants = await db
          .select()
          .from(accessoryVariants)
          .where(eq(accessoryVariants.accessoryId, accessory.id));
        return { ...accessory, variants };
      }),
    );

    return NextResponse.json(accessoriesWithVariants);
  } catch (error) {
    console.error("Failed to fetch accessories:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
