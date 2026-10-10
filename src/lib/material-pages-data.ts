import "server-only";
import { eq } from "drizzle-orm";
import { cache } from "react";
import { db } from "@/db/db";
import { materials } from "@/db/schema";
import {
  cleanMaterialName,
  type MaterialPageData,
  materialKind,
} from "@/lib/material-pages";

/** Published boards and backs, by name. Purchase prices never leave the server. */
export const getPublicMaterials = cache(
  async (): Promise<MaterialPageData[]> => {
    const rows = await db
      .select({
        id: materials.id,
        name: materials.name,
        productCode: materials.productCode,
        price: materials.price,
        img: materials.img,
        thickness: materials.thickness,
        categories: materials.categories,
      })
      .from(materials)
      .where(eq(materials.published, true));
    return rows
      .filter((m) => materialKind(m) !== null)
      .sort((a, b) =>
        cleanMaterialName(a.name).localeCompare(
          cleanMaterialName(b.name),
          "sr",
        ),
      );
  },
);
