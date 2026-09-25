/**
 * Sends sketches through the real prompt and the real import engine, and
 * prints what came out. Each image is one paid Claude call (~$0.05–0.10).
 *
 *   npx tsx --env-file=.env scripts/try-design-import.ts            # built-in synthetic sketches
 *   npx tsx --env-file=.env scripts/try-design-import.ts a.jpg b.png # your own images
 */
import { readFileSync } from "node:fs";
import sharp from "sharp";
import { importWardrobeDraft } from "@/lib/design-import/apply";
import { readWardrobeImage } from "@/lib/design-import/read-image";
import { useShelfStore } from "@/lib/store";
import { buildBlocksX } from "@/lib/wardrobe-utils";

// Slightly wobbly strokes so the synthetic images look hand-drawn.
let seed = 7;
const jitter = () => {
  seed = (seed * 1664525 + 1013904223) % 2 ** 32;
  return (seed / 2 ** 32 - 0.5) * 4;
};
const line = (x1: number, y1: number, x2: number, y2: number, w = 3) =>
  `<path d="M${x1 + jitter()} ${y1 + jitter()} Q${(x1 + x2) / 2 + jitter()} ${(y1 + y2) / 2 + jitter()} ${x2 + jitter()} ${y2 + jitter()}" stroke="#222" stroke-width="${w}" fill="none" stroke-linecap="round"/>`;
const rect = (x: number, y: number, w: number, h: number, sw = 3) =>
  line(x, y, x + w, y, sw) +
  line(x + w, y, x + w, y + h, sw) +
  line(x + w, y + h, x, y + h, sw) +
  line(x, y + h, x, y, sw);
const text = (x: number, y: number, t: string, size = 26) =>
  `<text x="${x}" y="${y}" font-family="Comic Sans MS, Marker Felt, sans-serif" font-size="${size}" fill="#333">${t}</text>`;
const svg = (body: string) =>
  `<svg xmlns="http://www.w3.org/2000/svg" width="1000" height="1000"><rect width="1000" height="1000" fill="#fbfaf6"/>${body}</svg>`;

const SKETCHES: Record<string, string> = {
  "square with a cross": svg(
    rect(200, 200, 600, 600) +
      line(500, 200, 500, 800) +
      line(200, 500, 800, 500),
  ),
  "3 sections: drawers, rail, shelves": svg(
    rect(100, 150, 800, 750) +
      line(367, 150, 367, 900) +
      line(633, 150, 633, 900) +
      // left: 3 drawers + 2 shelves
      [780, 720, 660]
        .map((y) => rect(115, y, 237, 55, 2))
        .join("") +
      line(100, 520, 367, 520) +
      line(100, 350, 367, 350) +
      text(170, 895, "fioke", 22) +
      // middle: rail with hangers
      line(385, 260, 615, 260, 5) +
      [420, 480, 540]
        .map((x) => line(x, 260, x - 20, 300, 2) + line(x, 260, x + 20, 300, 2))
        .join("") +
      text(460, 245, "šipka", 22) +
      // right: 3 shelves
      [340, 520, 700]
        .map((y) => line(633, y, 900, y))
        .join(""),
  ),
  "closed front, 4 doors": svg(
    rect(150, 100, 700, 800) +
      line(325, 100, 325, 900, 2) +
      line(500, 100, 500, 900) +
      line(675, 100, 675, 900, 2) +
      [310, 340, 660, 690].map((x) => line(x, 460, x, 540, 6)).join(""),
  ),
  "4 sections with measurements": svg(
    rect(150, 150, 700, 750) +
      [325, 500, 675].map((x) => line(x, 150, x, 900)).join("") +
      [400, 650].map((y) => line(150, y, 325, y)).join("") +
      line(500, 450, 675, 450) +
      text(430, 130, "210 cm") +
      text(40, 540, "240") +
      text(880, 540, "60"),
  ),
  "not a wardrobe (a sun)": svg(
    `<circle cx="500" cy="500" r="160" stroke="#222" stroke-width="4" fill="none"/>` +
      Array.from({ length: 12 }, (_, i) => {
        const a = (i / 12) * Math.PI * 2;
        return line(
          500 + Math.cos(a) * 200,
          500 + Math.sin(a) * 200,
          500 + Math.cos(a) * 300,
          500 + Math.sin(a) * 300,
        );
      }).join(""),
  ),
};

async function imagesToTry(): Promise<{ name: string; data: string }[]> {
  const files = process.argv.slice(2);
  if (files.length > 0) {
    return Promise.all(
      files.map(async (file) => ({
        name: file,
        data: (
          await sharp(readFileSync(file))
            .rotate()
            .resize(2000, 2000, { fit: "inside", withoutEnlargement: true })
            .jpeg({ quality: 85 })
            .toBuffer()
        ).toString("base64"),
      })),
    );
  }
  return Promise.all(
    Object.entries(SKETCHES).map(async ([name, source]) => ({
      name,
      data: (
        await sharp(Buffer.from(source)).jpeg({ quality: 85 }).toBuffer()
      ).toString("base64"),
    })),
  );
}

function describeStore() {
  const s = useShelfStore.getState();
  const columns = buildBlocksX(s.width / 100, s.verticalBoundaries);
  return columns.map((col, i) => {
    const letter = String.fromCharCode(65 + i);
    const configs = Object.entries(s.elementConfigs).filter(([k]) =>
      k.startsWith(letter),
    );
    return {
      col: letter,
      cm: Math.round(col.width * 100),
      shelves: (s.columnHorizontalBoundaries[i] ?? []).map((y) =>
        Math.round(y * 100),
      ),
      top: (s.columnTopModuleShelves[i] ?? []).length,
      sections: Math.max(1, ...configs.map(([, c]) => c.columns ?? 1)),
      drawers: configs
        .flatMap(([, c]) => c.drawerCounts ?? [])
        .reduce((a, b) => a + b, 0),
      rod: Object.entries(s.compartmentExtras).some(
        ([k, e]) => k.startsWith(letter) && e.rod,
      ),
      doors: s.doorGroups.filter((g) => g.column === letter).map((g) => g.type),
    };
  });
}

async function main() {
  let total = 0;
  for (const { name, data } of await imagesToTry()) {
    const started = Date.now();
    const reading = await readWardrobeImage({ data, mediaType: "image/jpeg" });
    const result = importWardrobeDraft(reading.draft);
    total += reading.estimatedCostUsd;
    const s = useShelfStore.getState();
    console.log(`\n=== ${name}`);
    console.log(
      `${reading.model} · ${reading.stopReason} · ${((Date.now() - started) / 1000).toFixed(1)}s · ${reading.inputTokens}/${reading.outputTokens} tok · $${reading.estimatedCostUsd.toFixed(3)}`,
    );
    console.log("draft:", JSON.stringify(reading.draft));
    console.log(
      `import: ${result.status}${result.violations.length ? ` (violations: ${result.violations.length})` : ""}`,
    );
    for (const a of result.adjustments) console.log(`  - ${a.message}`);
    if (result.status !== "empty") {
      console.log(
        `wardrobe: ${s.width}×${s.height}×${s.depth}${s.slidingDoors ? " sliding" : ""}`,
      );
      for (const c of describeStore()) console.log("  ", JSON.stringify(c));
    }
  }
  console.log(`\ntotal ≈ $${total.toFixed(2)}`);
}

main();
