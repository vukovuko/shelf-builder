import "dotenv/config";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { and, eq } from "drizzle-orm";
import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import * as schema from "./schema";
import { handleFinishes, handles } from "./schema";

type CsvHandleRow = {
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

const DEFAULT_CSV_PATH = "src/db/data/europrofil-handles.csv";

function parseCsv(content: string): string[][] {
  const rows: string[][] = [];
  let currentRow: string[] = [];
  let currentValue = "";
  let inQuotes = false;

  for (let index = 0; index < content.length; index++) {
    const char = content[index];
    const nextChar = content[index + 1];

    if (char === '"') {
      if (inQuotes && nextChar === '"') {
        currentValue += '"';
        index++;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }

    if (char === "," && !inQuotes) {
      currentRow.push(currentValue);
      currentValue = "";
      continue;
    }

    if ((char === "\n" || char === "\r") && !inQuotes) {
      if (char === "\r" && nextChar === "\n") {
        index++;
      }
      currentRow.push(currentValue);
      if (currentRow.some((value) => value.length > 0)) {
        rows.push(currentRow);
      }
      currentRow = [];
      currentValue = "";
      continue;
    }

    currentValue += char;
  }

  if (currentValue.length > 0 || currentRow.length > 0) {
    currentRow.push(currentValue);
    if (currentRow.some((value) => value.length > 0)) {
      rows.push(currentRow);
    }
  }

  return rows;
}

function toBoolean(value: string, fallback: boolean): boolean {
  if (!value) return fallback;
  return value.toLowerCase() === "true";
}

function toInteger(value: string, fallback = 0): number {
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) ? parsed : fallback;
}

async function main() {
  const { DATABASE_URL } = process.env;
  if (!DATABASE_URL) {
    console.error("Missing DATABASE_URL in .env");
    process.exit(1);
  }

  const csvPath = resolve(process.cwd(), process.argv[2] ?? DEFAULT_CSV_PATH);
  const rawCsv = await readFile(csvPath, "utf8");
  const [headerRow, ...dataRows] = parseCsv(rawCsv);

  if (!headerRow) {
    throw new Error(`CSV file is empty: ${csvPath}`);
  }

  const headers = headerRow.map((value) => value.trim());
  const rows = dataRows.map((values) => {
    const record = {} as Record<string, string>;
    headers.forEach((header, index) => {
      record[header] = values[index] ?? "";
    });
    return record as CsvHandleRow;
  });

  const sql = neon(DATABASE_URL);
  const db = drizzle(sql, { schema });

  for (const row of rows) {
    if (!row.legacyId || !row.name) {
      continue;
    }

    const existingHandle = await db.query.handles.findFirst({
      where: eq(handles.legacyId, row.legacyId),
      with: { finishes: true },
    });

    let handleId = existingHandle?.id;

    if (existingHandle) {
      await db
        .update(handles)
        .set({
          name: row.name,
          description: row.description || null,
          mainImage: row.mainImage || null,
          published: toBoolean(row.published, true),
        })
        .where(eq(handles.id, existingHandle.id));
    } else {
      const [insertedHandle] = await db
        .insert(handles)
        .values({
          legacyId: row.legacyId,
          name: row.name,
          description: row.description || null,
          mainImage: row.mainImage || null,
          published: toBoolean(row.published, true),
        })
        .returning({ id: handles.id });

      handleId = insertedHandle.id;
    }

    if (!handleId) {
      throw new Error(`Could not resolve handle id for ${row.legacyId}`);
    }

    const finishLegacyId = row.finishLegacyId || "default";
    const existingFinish = await db.query.handleFinishes.findFirst({
      where: and(
        eq(handleFinishes.handleId, handleId),
        eq(handleFinishes.legacyId, finishLegacyId),
      ),
    });

    const finishPayload = {
      handleId,
      legacyId: finishLegacyId,
      name: row.finishName || "Standard",
      image: row.finishImage || row.mainImage || null,
      price: toInteger(row.price, 0),
      costPrice: toInteger(row.costPrice, 0),
    };

    if (existingFinish) {
      await db
        .update(handleFinishes)
        .set(finishPayload)
        .where(eq(handleFinishes.id, existingFinish.id));
    } else {
      await db.insert(handleFinishes).values(finishPayload);
    }
  }

  console.log(`Imported ${rows.length} rows from ${csvPath}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});