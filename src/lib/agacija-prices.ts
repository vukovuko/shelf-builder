/**
 * Supplier Agacija's public price list: the JSON their own site search loads
 * (agacija.com). The search parameter is ignored; it returns every item.
 */
export const AGACIJA_INDEX_URL =
  "https://apanel.rs/agacijaApp/admin/searchIndex?search_param=";

/** Fewer items than this means the list didn't load, not that prices are gone. */
export const AGACIJA_MIN_ITEMS = 100;

/** Agacija's product photo; we keep a copy in R2 as materials/<code>.jpg. */
export function agacijaImageUrl(code: string): string {
  return `https://www.agacija.com/img/paleta-materijala/tmp/${encodeURIComponent(code)}.jpg`;
}

export interface AgacijaItem {
  code: string;
  name: string;
  price: number;
  /** "m2" for boards; edge bands and worktops use "m". */
  unit: string;
  /** Agacija's group: "Pločasti" for boards, "Radna ploča" for worktops… */
  category: string | null;
  /** Board thickness in mm when the name states it ("… 18 MM"). */
  thickness: number | null;
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
    const name = text
      .split(" - ")
      .slice(1)
      .join(" - ")
      .replace(/\s*cena:.*$/i, "")
      .trim();
    const thickness = name.match(/(\d+)\s*MM\b/i);
    items.set(code, {
      code,
      name: name.replace(/\s*\([^)]*\)\s*$/, ""),
      price: Number(price[1]),
      unit: price[2].toLowerCase(),
      category: name.match(/\(([^)]+)\)\s*$/)?.[1] ?? null,
      thickness: thickness ? Number(thickness[1]) : null,
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
  /** Per-material override; null = the global margin. */
  marginPercent: number | null;
}

export interface PriceChange {
  id: number;
  name: string;
  code: string;
  oldPrice: number;
  oldCost: number;
  supplierPrice: number;
  newPrice: number;
  marginPercent: number;
  /** True when the material's own margin was used, not the global one. */
  ownMargin: boolean;
}

export interface PricePlan {
  changes: PriceChange[];
  unchanged: number;
  notFound: { id: number; name: string; code: string | null }[];
}

export function priceWithMargin(cost: number, marginPercent: number): number {
  return Math.round(cost * (1 + marginPercent / 100));
}

/**
 * New prices from the supplier list: costPrice = Agacija's price per m²,
 * price = that plus the material's own margin, or the global one when it has
 * none, both rounded to whole dinars.
 */
export function planPriceSync(
  materials: PricedMaterial[],
  index: Map<string, AgacijaItem>,
  globalMarginPercent: number,
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
    const marginPercent = material.marginPercent ?? globalMarginPercent;
    const newCost = Math.round(item.price);
    const newPrice = priceWithMargin(newCost, marginPercent);
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
      marginPercent,
      ownMargin: material.marginPercent !== null,
    });
  }
  return plan;
}

// Raw boards, plywood, solid-wood panels and compact laminate: Agacija sells
// them in the same group, but they aren't decor boards for wardrobes.
const NOT_DECOR_BOARD =
  /^(MMDF|MDF SIROVI|SIROVA IVERICA|PANEL|ŠPER|VODOOTPORNI|OSB)\b|KOMPAKT/i;

/**
 * Agacija decor boards (18–19 mm, priced per m²) that the catalog doesn't
 * have yet. Boards whose name gives no thickness are included, as most of
 * the catalog's are.
 */
export function findNewProducts(
  index: Map<string, AgacijaItem>,
  existingCodes: Iterable<string | null>,
): AgacijaItem[] {
  const have = new Set(
    [...existingCodes].map((c) => normalizeCode(c ?? "")).filter(Boolean),
  );
  return [...index.values()]
    .filter(
      (item) =>
        item.unit === "m2" &&
        item.category === "Pločasti" &&
        (item.thickness === null ||
          item.thickness === 18 ||
          item.thickness === 19) &&
        !NOT_DECOR_BOARD.test(item.name) &&
        !have.has(item.code),
    )
    .sort((a, b) => a.name.localeCompare(b.name, "sr"));
}
