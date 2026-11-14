import {
  isBackMaterialCategory,
  isEdgeTapeCategory,
  isFrontMaterialCategory,
  isKorpusMaterialCategory,
} from "@/lib/material-categories";
import { getWardrobeSnapshot } from "@/lib/serializeWardrobe";
import { useShelfStore } from "@/lib/store";

export interface DefaultMaterialIds {
  korpus: number;
  front: number;
  back: number;
  edge: number;
}

/**
 * The materials the configurator starts with: the first of each kind in the
 * list it was given. The same rule as the effect in ConfiguratorControls and
 * MobileBottomTabs, so a price worked out here is the one a visitor sees
 * before choosing anything. Null when the catalog lacks one of the kinds.
 */
export function defaultMaterialIds(
  materials: { id: number; categories: string[] }[],
): DefaultMaterialIds | null {
  const first = (is: (category: string) => boolean) =>
    materials.find((material) => material.categories.some(is))?.id;
  const korpus = first(isKorpusMaterialCategory);
  const front = first(isFrontMaterialCategory);
  const back = first(isBackMaterialCategory);
  const edge = first(isEdgeTapeCategory);
  if (!korpus || !front || !back || !edge) return null;
  return { korpus, front, back, edge };
}

export interface OuterSize {
  /** All three in centimetres. */
  width: number;
  height: number;
  depth: number;
}

/**
 * The design the configurator shows for these outer dimensions when nothing
 * else was touched: it goes through the configurator's own store, so the
 * columns and shelves are the ones the page would draw.
 *
 * The store is one per process, also on the server. Everything here is
 * synchronous, so no other request can see the store in between, and it is
 * left at its defaults.
 */
export function defaultDesign(size: OuterSize, materials: DefaultMaterialIds) {
  const store = useShelfStore.getState();
  store.resetToDefaults();
  store.setSelectedMaterialId(materials.korpus);
  store.setSelectedFrontMaterialId(materials.front);
  store.setSelectedBackMaterialId(materials.back);
  store.setSelectedEdgeMaterialId(materials.edge);
  store.setSelectedFrontEdgeMaterialId(materials.edge);
  applyOuterSize(size);
  const snapshot = getWardrobeSnapshot();
  store.resetToDefaults();
  return snapshot;
}

/** Sets the outer dimensions the way `defaultDesign` does. */
export function applyOuterSize(size: OuterSize) {
  const store = useShelfStore.getState();
  store.setWidth(size.width);
  store.setHeight(size.height);
  store.setDepth(size.depth);
}

// The names are Serbian because the link is written out for people too:
// /design?sirina=240&visina=210&dubina=60
const SIZE_PARAMS = { width: "sirina", height: "visina", depth: "dubina" };
export const SIZE_PARAM_NAMES = Object.values(SIZE_PARAMS);

export function designLink(base: string, size: OuterSize): string {
  return `${base}/design?${SIZE_PARAMS.width}=${size.width}&${SIZE_PARAMS.height}=${size.height}&${SIZE_PARAMS.depth}=${size.depth}`;
}

/**
 * The dimensions a link asks the configurator to open with, kept inside
 * what can be built. A dimension the link leaves out or garbles stays at the
 * configurator's default. Null when the link names none.
 */
export function sizeFromSearch(
  search: URLSearchParams,
  ranges: Record<keyof OuterSize, readonly [number, number]>,
): OuterSize | null {
  const defaults = useShelfStore.getInitialState();
  let named = false;
  const read = (key: keyof OuterSize) => {
    const value = Number.parseInt(search.get(SIZE_PARAMS[key]) ?? "", 10);
    if (!Number.isFinite(value)) return defaults[key];
    named = true;
    const [min, max] = ranges[key];
    return Math.min(max, Math.max(min, value));
  };
  const size = {
    width: read("width"),
    height: read("height"),
    depth: read("depth"),
  };
  return named ? size : null;
}
