import { defaultDesign, defaultMaterialIds } from "@/lib/default-design";
import type { PriceGuide } from "@/lib/llms";
import { cleanMaterialName } from "@/lib/material-pages";
import { loadDesignerData } from "./designer.server";
import { cachedCatalogData } from "./edge-cache.server";
import {
  ANONYMOUS,
  loadPricingCatalog,
  previewPrice,
} from "./price-preview.server";

// Typical wardrobes, priced the way the configurator prices them, for
// llms.txt: an AI assistant asked "how much is a 240 cm wardrobe" can answer
// from this instead of guessing. Each number is what the configurator shows
// for that size before the visitor changes anything else.

const WIDTHS = [100, 150, 200, 250, 300];
const HEIGHTS = [210, 240, 260];
const DEPTH = 60;

async function buildPriceGuide(): Promise<PriceGuide | null> {
  const [designer, catalog] = await Promise.all([
    // The list the configurator gets, in its order: the first material of
    // each kind is its default.
    loadDesignerData(new Headers()),
    loadPricingCatalog(),
  ]);
  const materials = defaultMaterialIds(designer.materials);
  if (!materials) return null;

  const priceOf = (width: number, height: number) => {
    const snapshot = defaultDesign({ width, height, depth: DEPTH }, materials);
    const { baseTotal, adjustedTotal } = previewPrice(
      {
        snapshot,
        materialId: materials.korpus,
        frontMaterialId: materials.front,
        backMaterialId: materials.back,
        edgeMaterialId: materials.edge,
        frontEdgeMaterialId: materials.edge,
        customer: ANONYMOUS,
      },
      catalog,
    );
    return adjustedTotal ?? baseTotal;
  };

  return {
    material: cleanMaterialName(catalog.matMap.get(materials.korpus) ?? ""),
    depth: DEPTH,
    widths: WIDTHS,
    heights: HEIGHTS,
    prices: WIDTHS.map((width) =>
      HEIGHTS.map((height) => priceOf(width, height)),
    ),
    calculatedOn: new Date().toISOString().slice(0, 10),
  };
}

/**
 * Stored with the catalog cache, so it is worked out again after a change
 * to materials, hardware, price rules or settings, and at least once a day.
 * Null when it cannot be made; llms.txt then goes without prices.
 */
export async function loadPriceGuide(): Promise<PriceGuide | null> {
  try {
    return await cachedCatalogData("price-guide", buildPriceGuide);
  } catch (error) {
    console.error("price guide: not available", error);
    return null;
  }
}
