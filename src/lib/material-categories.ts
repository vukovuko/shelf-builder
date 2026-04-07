export const MATERIAL_CATEGORY_KORPUS = "Materijal za Korpus (18mm)";
export const MATERIAL_CATEGORY_FRONT = "Materijal za Lica/Vrata (18mm)";
export const MATERIAL_CATEGORY_BACK = "Materijal za Leđa (3mm)";
export const MATERIAL_CATEGORY_EDGE_MELAMINE = "Kant trake melaminske";
export const MATERIAL_CATEGORY_EDGE_ABS = "Kant trake abs";
export const MATERIAL_CATEGORY_EDGE_DISPLAY = "Kant traka";

export const AVAILABLE_MATERIAL_CATEGORIES = [
  MATERIAL_CATEGORY_KORPUS,
  MATERIAL_CATEGORY_FRONT,
  MATERIAL_CATEGORY_BACK,
  MATERIAL_CATEGORY_EDGE_MELAMINE,
  MATERIAL_CATEGORY_EDGE_ABS,
] as const;

export function isBackMaterialCategory(category: string) {
  const normalized = category.toLowerCase();
  return normalized.includes("leđa") || normalized.includes("ledja");
}

export function isFrontMaterialCategory(category: string) {
  const normalized = category.toLowerCase();
  return normalized.includes("lica") || normalized.includes("vrata");
}

export function isEdgeTapeCategory(category: string) {
  const normalized = category.toLowerCase();
  return normalized.includes("kant trake") || normalized.includes("kant traka");
}

export function isKorpusMaterialCategory(category: string) {
  return category.toLowerCase().includes("korpus");
}
