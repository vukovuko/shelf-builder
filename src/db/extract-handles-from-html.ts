import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { JSDOM } from "jsdom";

type ExtractedHandleRow = {
  legacyId: string;
  name: string;
  description: string;
  mainImage: string;
  published: string;
  finishLegacyId: string;
  finishName: string;
  finishImage: string;
  price: string;
  costPrice: string;
  sourceVendor: string;
  sourceSku: string;
  sourceUrl: string;
  sourceProductId: string;
  sourcePriceRsd: string;
  inStock: string;
};

const DEFAULT_INPUT = "src/db/data/europrofil-handles.html";
const DEFAULT_OUTPUT = "src/db/data/europrofil-handles.csv";

function escapeCsvValue(value: string): string {
  if (/[,"\n]/.test(value)) {
    return `"${value.replaceAll('"', '""')}"`;
  }

  return value;
}

function normalizeWhitespace(value: string): string {
  return value.replace(/\s+/g, " ").trim();
}

function slugify(value: string): string {
  return value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

function parseSerbianPrice(value: string): {
  integer: number;
  decimal: number;
} {
  const normalized = value
    .replace(/\s*RSD/i, "")
    .replaceAll(".", "")
    .replace(",", ".")
    .trim();

  const decimal = Number.parseFloat(normalized);
  return {
    decimal: Number.isFinite(decimal) ? decimal : 0,
    integer: Number.isFinite(decimal) ? Math.round(decimal) : 0,
  };
}

function inferFinishName(name: string): string {
  const lowerName = name.toLowerCase();

  if (lowerName.includes("crna")) return "Crna";
  if (lowerName.includes("bela")) return "Bela";
  if (lowerName.includes("zlato")) return "Zlato";
  if (lowerName.includes("inox")) return "Inox";
  if (lowerName.includes("saten")) return "Saten";
  if (lowerName.includes("sjaj")) return "Sjaj";
  if (lowerName.includes("mat")) return "Mat";
  if (lowerName.includes("sm")) return "SM";
  if (lowerName.includes("sb")) return "SB";

  return "Standard";
}

function buildRowFromItem(item: Element): ExtractedHandleRow | null {
  const link = item.querySelector<HTMLAnchorElement>(".product-item-name a");
  const image = item.querySelector<HTMLImageElement>(".product-item-photo img");
  const article = item.querySelector(".product-item-detail span[style]");
  const priceEl = item.querySelector(".product-item-price .price");
  const cartButton = item.querySelector<HTMLButtonElement>(".addToCart");
  const stockDot = item.querySelector<HTMLElement>(".dot-green, .dot-red");

  if (!link || !image || !article || !priceEl) {
    return null;
  }

  const name = normalizeWhitespace(link.textContent ?? "");
  const sourceSku = normalizeWhitespace(
    (article.textContent ?? "").replace(/^art\.\s*/i, ""),
  );
  if (!name || !sourceSku) {
    return null;
  }

  const price = parseSerbianPrice(priceEl.textContent ?? "0");
  const finishName = inferFinishName(name);
  const finishLegacyId = slugify(finishName) || "standard";
  const legacyId = `europrofil-${slugify(sourceSku) || slugify(name)}`;

  return {
    legacyId,
    name,
    description: `Europrofil art. ${sourceSku}`,
    mainImage: image.src,
    published: "true",
    finishLegacyId,
    finishName,
    finishImage: image.src,
    price: String(price.integer),
    costPrice: "0",
    sourceVendor: "europrofil",
    sourceSku,
    sourceUrl: link.href,
    sourceProductId: cartButton?.dataset.id ?? "",
    sourcePriceRsd: price.decimal.toFixed(2),
    inStock: stockDot?.classList.contains("dot-green") ? "true" : "false",
  };
}

async function main() {
  const inputPath = resolve(process.cwd(), process.argv[2] ?? DEFAULT_INPUT);
  const outputPath = resolve(process.cwd(), process.argv[3] ?? DEFAULT_OUTPUT);
  const html = await readFile(inputPath, "utf8");
  const dom = new JSDOM(html);
  const items: Element[] = Array.from(
    dom.window.document.querySelectorAll("li.product-item"),
  );
  const rows = items
    .map((item) => buildRowFromItem(item))
    .filter((row): row is ExtractedHandleRow => row !== null);

  const header = [
    "legacyId",
    "name",
    "description",
    "mainImage",
    "published",
    "finishLegacyId",
    "finishName",
    "finishImage",
    "price",
    "costPrice",
    "sourceVendor",
    "sourceSku",
    "sourceUrl",
    "sourceProductId",
    "sourcePriceRsd",
    "inStock",
  ];

  const lines = [
    header.join(","),
    ...rows.map((row) =>
      header
        .map((column) =>
          escapeCsvValue(row[column as keyof ExtractedHandleRow]),
        )
        .join(","),
    ),
  ];

  await mkdir(dirname(outputPath), { recursive: true });
  await writeFile(outputPath, `${lines.join("\n")}\n`, "utf8");

  console.log(`Extracted ${rows.length} handles to ${outputPath}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
