/**
 * Supplier Agacija's public price list: the JSON their own site search loads
 * (agacija.com). The search parameter is ignored; it returns every item.
 */
export const AGACIJA_INDEX_URL =
  "https://apanel.rs/agacijaApp/admin/searchIndex?search_param=";

/** Fewer items than this means the list didn't load, not that prices are gone. */
export const AGACIJA_MIN_ITEMS = 100;

export interface AgacijaItem {
  code: string;
  name: string;
  price: number;
  /** "m2" for boards; edge bands and worktops use "m". */
  unit: string;
}

export function normalizeCode(code: string): string {
  return code.trim().toUpperCase();
}

/**
 * Items look like {"name": "<small>H3303ST10 - EGGER ARLINGTON HRAST H3303
 * ST10 18 MM (Pločasti) </br>cena: 3008.00 rsd/m2</small>", "itemData":
 * "H3303ST10|egger-arlington-hrast-h3303-st10-18-mm"}.
 */
export function parseAgacijaIndex(raw: unknown): Map<string, AgacijaItem> {
  const items = new Map<string, AgacijaItem>();
  if (!Array.isArray(raw)) return items;
  for (const entry of raw) {
    if (typeof entry?.name !== "string" || typeof entry?.itemData !== "string")
      continue;
    const text = entry.name.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ");
    const price = text.match(/cena:\s*([\d.]+)\s*rsd\/(\w+)/i);
    if (!price) continue;
    const code = normalizeCode(entry.itemData.split("|")[0] ?? "");
    if (!code) continue;
    items.set(code, {
      code,
      name: text
        .split(" - ")
        .slice(1)
        .join(" - ")
        .replace(/\s*cena:.*$/i, "")
        .trim(),
      price: Number(price[1]),
      unit: price[2].toLowerCase(),
    });
  }
  return items;
}

export interface PricedMaterial {
  id: number;
  name: string;
  productCode: string | null;
  price: number;
  costPrice: number;
}

export interface PriceChange {
  id: number;
  name: string;
  code: string;
  oldPrice: number;
  oldCost: number;
  supplierPrice: number;
  newPrice: number;
}

export interface PricePlan {
  changes: PriceChange[];
  unchanged: number;
  notFound: { id: number; name: string; code: string | null }[];
}

/**
 * New prices from the supplier list: costPrice = Agacija's price per m²,
 * price = that plus the margin, both rounded to whole dinars.
 */
export function planPriceSync(
  materials: PricedMaterial[],
  index: Map<string, AgacijaItem>,
  marginPercent: number,
): PricePlan {
  const plan: PricePlan = { changes: [], unchanged: 0, notFound: [] };
  for (const material of materials) {
    const item = index.get(normalizeCode(material.productCode ?? ""));
    if (!item || item.unit !== "m2") {
      plan.notFound.push({
        id: material.id,
        name: material.name,
        code: material.productCode,
      });
      continue;
    }
    const newCost = Math.round(item.price);
    const newPrice = Math.round(newCost * (1 + marginPercent / 100));
    if (newPrice === material.price && newCost === material.costPrice) {
      plan.unchanged++;
      continue;
    }
    plan.changes.push({
      id: material.id,
      name: material.name,
      code: item.code,
      oldPrice: material.price,
      oldCost: material.costPrice,
      supplierPrice: newCost,
      newPrice,
    });
  }
  return plan;
}
