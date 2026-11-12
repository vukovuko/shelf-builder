import { eq } from "drizzle-orm";
import { db } from "@/db/db";
import { accessoryRules, materials } from "@/db/schema";
import { serializeRule } from "@/lib/accessory-rules/server";

/**
 * What the 3D view of a design needs besides the design itself: every
 * material (with purchase prices, this is admin only) and the accessory
 * rules in force.
 */
export async function loadSceneCatalog() {
  const [allMaterials, enabledRules] = await Promise.all([
    db.select().from(materials),
    db.select().from(accessoryRules).where(eq(accessoryRules.enabled, true)),
  ]);
  return {
    materials: allMaterials.map((m) => ({
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
    accessoryRules: enabledRules.map(serializeRule),
  };
}
