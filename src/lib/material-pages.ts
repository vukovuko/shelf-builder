import {
  isBackMaterialCategory,
  isFrontMaterialCategory,
  isKorpusMaterialCategory,
} from "@/lib/material-categories";

/** The material fields the public /materijali pages show. */
export interface MaterialPageData {
  id: number;
  name: string;
  productCode: string | null;
  price: number;
  img: string | null;
  thickness: number | null;
  categories: string[];
  description: string | null;
  popularRank: number | null;
}

export type MaterialKind = "board" | "back";

const KEEP_UPPERCASE = new Set(["MDF", "HDF", "ABS"]);

function titleWord(word: string): string {
  if (KEEP_UPPERCASE.has(word.toUpperCase())) return word.toUpperCase();
  const lower = word.toLocaleLowerCase("sr");
  return lower.charAt(0).toLocaleUpperCase("sr") + lower.slice(1);
}

/**
 * Supplier names mix the decor name with its code, sheet size, thickness and
 * an "OUT-" stock marker ("EGGER FINELINE TAMNO SIVI-H3198ST19",
 * "OUT-ARTSTONE OXYDE - 2800x2120x18 - TR9"). The decor name is everything
 * before the first word with a digit in it.
 */
export function cleanMaterialName(raw: string): string {
  const words = raw
    .replace(/^OUT\s*-\s*/i, "")
    .replace(/\([^)]*\)/g, " ")
    .replace(/-(?=[A-Z]*\d)/gi, " ")
    .split(/[\s ]+/)
    .filter(Boolean);
  const cut = words.findIndex((word) => /\d/.test(word));
  const kept = (cut === -1 ? words : words.slice(0, cut)).filter(
    (word) => !/^-+$/.test(word),
  );
  if (kept.length === 0) return raw.trim();
  return kept.map(titleWord).join(" ");
}

/** Lowercase without diacritics, so "šerman" matches "serman". */
export function foldForSearch(text: string): string {
  return text
    .toLowerCase()
    .replace(/đ/g, "dj")
    .normalize("NFD")
    .replace(/\p{M}/gu, "");
}

function slugify(text: string): string {
  return foldForSearch(text)
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/** The code part of a material URL, e.g. "h1344st32". */
export function materialCodeSlug(material: {
  id: number;
  productCode: string | null;
}): string {
  return slugify(material.productCode ?? String(material.id)).replace(/-/g, "");
}

/** "/materijali/egger-hrast-serman-braon-h1344st32": the name, then the code. */
export function materialSlug(material: MaterialPageData): string {
  return `${slugify(cleanMaterialName(material.name))}-${materialCodeSlug(material)}`;
}

/** The code is the last part of the URL; the name before it is only for people. */
export function codeFromSlug(slug: string): string {
  return slug.split("-").at(-1) ?? "";
}

/** Boards (korpus and doors) and backs get pages; edge tapes don't. */
export function materialKind(material: MaterialPageData): MaterialKind | null {
  if (material.categories.some(isBackMaterialCategory)) return "back";
  if (
    material.categories.some(
      (c) => isKorpusMaterialCategory(c) || isFrontMaterialCategory(c),
    )
  ) {
    return "board";
  }
  return null;
}

/** What the material can be picked for in the configurator, e.g. "korpus i vrata". */
export function materialUses(material: MaterialPageData): string {
  const uses: string[] = [];
  if (material.categories.some(isKorpusMaterialCategory)) uses.push("korpus");
  if (material.categories.some(isFrontMaterialCategory)) uses.push("vrata");
  if (material.categories.some(isBackMaterialCategory)) uses.push("leđa");
  return uses.join(" i ");
}

/** Only brands the supplier name states outright. */
export function materialBrand(material: MaterialPageData): string | null {
  return /\bEGGER\b/i.test(material.name) ? "Egger" : null;
}

/** "MDF" or "lesonit (HDF)" when the name says so, otherwise null. */
export function materialType(material: MaterialPageData): string | null {
  if (/\bMDF\b/i.test(material.name)) return "MDF";
  if (/\b(LESONIT|HDF)\b/i.test(material.name)) return "lesonit (HDF)";
  return null;
}

export function formatPricePerM2(price: number): string {
  return `${price.toLocaleString("sr-RS")} RSD/m²`;
}

// Words that say nothing about how a decor looks.
const NOT_DECOR = new Set(["egger", "mdf", "hdf", "lesonit", "front", "out"]);

function decorWords(material: MaterialPageData): Set<string> {
  return new Set(
    slugify(cleanMaterialName(material.name))
      .split("-")
      .filter((w) => w.length > 2 && !NOT_DECOR.has(w)),
  );
}

/** Decors sharing words with this one (hrast, siva…), closest price first. */
export function similarMaterials(
  material: MaterialPageData,
  all: MaterialPageData[],
  count = 6,
): MaterialPageData[] {
  const kind = materialKind(material);
  const words = decorWords(material);
  return all
    .filter((m) => m.id !== material.id && materialKind(m) === kind)
    .map((m) => {
      const shared = [...decorWords(m)].filter((w) => words.has(w)).length;
      return { m, shared, priceGap: Math.abs(m.price - material.price) };
    })
    .sort((a, b) => b.shared - a.shared || a.priceGap - b.priceGap)
    .slice(0, count)
    .map(({ m }) => m);
}

/** "MDF ploča 18 mm", "Lesonit (HDF) 3 mm", "Ploča 18 mm". */
export function materialSummary(material: MaterialPageData): string {
  const type = materialType(material);
  const label =
    type === null ? "Ploča" : type === "MDF" ? "MDF ploča" : "Lesonit (HDF)";
  return material.thickness ? `${label} ${material.thickness} mm` : label;
}

/** Search-result description: name, code, what it is, price. */
export function materialMetaDescription(material: MaterialPageData): string {
  const name = cleanMaterialName(material.name);
  const code = material.productCode ? `, šifra ${material.productCode}` : "";
  return `${name}${code}. ${materialSummary(material)} za ${materialUses(material)} ormana, ${formatPricePerM2(material.price)}. Napravite orman po meri u ovom dekoru u 3D konfiguratoru.`;
}

/** Whether search engines may index /materijali; also puts the pages in the sitemap. */
export const MATERIAL_PAGES_INDEXED = true;

/**
 * schema.org Product for Google's product snippets. Not merchant-listing
 * markup: a decor is bought as part of a wardrobe, not on its own page.
 * The price is per square metre (UN/CEFACT unit code MTK).
 */
export function materialJsonLd(material: MaterialPageData, baseUrl: string) {
  const url = `${baseUrl}/materijali/${materialSlug(material)}`;
  const brand = materialBrand(material);
  return {
    "@context": "https://schema.org",
    "@type": "Product",
    name: `${cleanMaterialName(material.name)} ${material.productCode ?? ""}`.trim(),
    sku: material.productCode ?? undefined,
    description:
      material.description?.trim() || materialMetaDescription(material),
    image: material.img ?? undefined,
    url,
    category: materialSummary(material),
    brand: brand ? { "@type": "Brand", name: brand } : undefined,
    offers: {
      "@type": "Offer",
      url,
      price: material.price,
      priceCurrency: "RSD",
      priceSpecification: {
        "@type": "UnitPriceSpecification",
        price: material.price,
        priceCurrency: "RSD",
        referenceQuantity: {
          "@type": "QuantitativeValue",
          value: 1,
          unitCode: "MTK",
        },
      },
      availability: "https://schema.org/InStock",
      seller: { "@type": "Organization", name: "Ormani po meri", url: baseUrl },
    },
  };
}

export function materialBreadcrumbJsonLd(
  material: MaterialPageData,
  baseUrl: string,
) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Početna", item: baseUrl },
      {
        "@type": "ListItem",
        position: 2,
        name: "Materijali",
        item: `${baseUrl}/materijali`,
      },
      {
        "@type": "ListItem",
        position: 3,
        name: cleanMaterialName(material.name),
        item: `${baseUrl}/materijali/${materialSlug(material)}`,
      },
    ],
  };
}
