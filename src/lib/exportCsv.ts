/**
 * CSV Export utility for cut list data
 * Exports cut list items to a CSV file for CNC machines
 */

export interface CutListItem {
  code: string;
  desc: string;
  widthCm: number;
  heightCm: number;
  thicknessMm: number;
  areaM2: number;
  cost: number;
  element: string;
  materialType: "korpus" | "front" | "back";
}

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
    "Oznaka",
    "Opis",
    "Sirina_cm",
    "Visina_cm",
    "Debljina_mm",
    "Povrsina_m2",
    "Cena_RSD",
    "Element",
    "Tip_materijala",
  ];

  const rows = items.map((item) => [
    item.code,
    `"${item.desc.replace(/"/g, '""')}"`, // Escape quotes in description
    item.widthCm.toFixed(2),
    item.heightCm.toFixed(2),
    item.thicknessMm.toString(),
    item.areaM2.toFixed(4),
    item.cost.toFixed(2),
    item.element,
    item.materialType,
  ]);

  // Add BOM for Excel UTF-8 compatibility
  const bom = "\uFEFF";
  const csv =
    bom + [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
  downloadFile(csv, filename, "text/csv;charset=utf-8;");
}
