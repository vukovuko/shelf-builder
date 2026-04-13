/**
 * CSV Export utility for cut list data
 * Exports cut list items to a CSV file for CNC machines
 */

import type { CutListEdgeFlags, CutListItem } from "@/lib/calcCutList";

type BoardCutListItem = CutListItem & {
  materialType: "korpus" | "front" | "back";
};

type GroupedCncRow = {
  sifra: string;
  naziv: string;
  duzina: number;
  kd1: number;
  kd2: number;
  sirina: number;
  ks1: number;
  ks2: number;
  kom: number;
  t: number;
  napomena: string;
};

function downloadFile(
  content: string,
  filename: string,
  mimeType: string,
): void {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

function escapeCsvValue(value: string): string {
  if (/[;"\n]/.test(value)) {
    return `"${value.replaceAll('"', '""')}"`;
  }

  return value;
}

function formatDimension(value: number): string {
  return Number.isInteger(value) ? String(value) : value.toFixed(2);
}

function toFlag(value: boolean | undefined): number {
  return value ? 1 : 0;
}

function getDefaultEdgeFlags(): CutListEdgeFlags {
  return {
    longSide1: false,
    longSide2: false,
    shortSide1: false,
    shortSide2: false,
  };
}

function isBoardItem(item: CutListItem): item is BoardCutListItem {
  return (
    item.materialType === "korpus" ||
    item.materialType === "front" ||
    item.materialType === "back"
  );
}

function buildGroupedCncRows(items: CutListItem[]): GroupedCncRow[] {
  const groupedRows = new Map<
    string,
    Omit<GroupedCncRow, "napomena"> & {
      kom: number;
      notes: Set<string>;
      napomena: string;
    }
  >();

  for (const item of items.filter(isBoardItem)) {
    const edgeFlags = item.edgeFlags ?? getDefaultEdgeFlags();
    const duzina = Math.max(item.widthCm, item.heightCm);
    const sirina = Math.min(item.widthCm, item.heightCm);
    const sifra = item.materialProductCode?.trim() || String(item.materialType);
    const groupKey = [
      sifra,
      duzina.toFixed(2),
      sirina.toFixed(2),
      toFlag(edgeFlags.longSide1),
      toFlag(edgeFlags.longSide2),
      toFlag(edgeFlags.shortSide1),
      toFlag(edgeFlags.shortSide2),
    ].join("|");

    const existing = groupedRows.get(groupKey);
    if (existing) {
      existing.kom += item.quantity ?? 1;
      existing.notes.add(item.desc);
      continue;
    }

    groupedRows.set(groupKey, {
      sifra,
      naziv: item.code,
      duzina,
      kd1: toFlag(edgeFlags.longSide1),
      kd2: toFlag(edgeFlags.longSide2),
      sirina,
      ks1: toFlag(edgeFlags.shortSide1),
      ks2: toFlag(edgeFlags.shortSide2),
      kom: item.quantity ?? 1,
      t: 0,
      napomena: item.desc,
      notes: new Set([item.desc]),
    });
  }

  return Array.from(groupedRows.values())
    .map((row) => ({
      sifra: row.sifra,
      naziv: row.naziv,
      duzina: row.duzina,
      kd1: row.kd1,
      kd2: row.kd2,
      sirina: row.sirina,
      ks1: row.ks1,
      ks2: row.ks2,
      kom: row.kom,
      t: row.t,
      napomena: Array.from(row.notes).sort().join(" | "),
    }))
    .sort((left, right) => {
      if (left.sifra !== right.sifra) {
        return left.sifra.localeCompare(right.sifra, "sr");
      }
      if (left.duzina !== right.duzina) {
        return right.duzina - left.duzina;
      }
      return right.sirina - left.sirina;
    });
}

/**
 * Export cut list items to CSV file
 * @param items - Array of cut list items
 * @param filename - Output filename (default: "cut-list.csv")
 */
export function exportCutListAsCsv(
  items: CutListItem[],
  filename = "cut-list.csv",
): void {
  const headers = [
    "Šifra",
    "Naziv",
    "Dužina",
    "KD1",
    "KD2",
    "Širina",
    "KŠ1",
    "KŠ2",
    "Kom",
    "T",
    "Napomena",
  ];
  const rows = buildGroupedCncRows(items).map((row) => [
    row.sifra,
    row.naziv,
    formatDimension(row.duzina),
    String(row.kd1),
    String(row.kd2),
    formatDimension(row.sirina),
    String(row.ks1),
    String(row.ks2),
    String(row.kom),
    String(row.t),
    row.napomena,
  ]);

  // Add BOM for Excel UTF-8 compatibility
  const bom = "\uFEFF";
  const csv =
    bom +
    [
      headers.join(";"),
      ...rows.map((row) => row.map((value) => escapeCsvValue(value)).join(";")),
    ].join("\n");
  downloadFile(csv, filename, "text/csv;charset=utf-8;");
}
