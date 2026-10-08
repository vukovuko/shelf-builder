import { and, asc, eq, inArray } from "drizzle-orm";
import { type NextRequest, NextResponse } from "next/server";
import { db } from "@/db/db";
import { materials, wardrobes } from "@/db/schema";
import { getEnabledAccessoryRules } from "@/lib/accessory-rules/server";
import { requireAdmin } from "@/lib/roles";

/**
 * Everything the models page needs to compute the models' cut lists in the
 * browser (the configurator store does the computing): the models' saved
 * designs plus the material catalogue and accessory rules. `?ids=a,b` limits
 * it to those models; without it, every model.
 */
export async function GET(request: NextRequest) {
  try {
    await requireAdmin();
  } catch (error) {
    const unauthorized =
      error instanceof Error && error.message === "UNAUTHORIZED";
    return NextResponse.json(
      { error: unauthorized ? "Unauthorized" : "Forbidden" },
      { status: unauthorized ? 401 : 403 },
    );
  }

  const ids = (request.nextUrl.searchParams.get("ids") ?? "")
    .split(",")
    .map((id) => id.trim())
    .filter(Boolean)
    .slice(0, 500);

  const [models, catalogue, accessoryRules] = await Promise.all([
    db
      .select({ id: wardrobes.id, name: wardrobes.name, data: wardrobes.data })
      .from(wardrobes)
      .where(
        ids.length
          ? and(eq(wardrobes.isModel, true), inArray(wardrobes.id, ids))
          : eq(wardrobes.isModel, true),
      )
      .orderBy(asc(wardrobes.name)),
    db.select().from(materials),
    getEnabledAccessoryRules(),
  ]);

  return NextResponse.json({
    models,
    materials: catalogue.map((m) => ({
      id: m.id,
      name: m.name,
      productCode: m.productCode,
      price: m.price,
      costPrice: m.costPrice,
      img: m.img,
      thickness: m.thickness,
      stock: m.stock,
      categories: m.categories,
      published: m.published,
    })),
    accessoryRules,
  });
}
