/**
 * Computes door-related metrics from a wardrobe snapshot for the rule engine.
 * Reuses the same column/compartment geometry as calcCutList.ts.
 */

import { buildBlocksX } from "@/lib/wardrobe-utils";
import { parseSubCompKey } from "@/lib/store";
import { TARGET_BOTTOM_HEIGHT, MIN_TOP_HEIGHT } from "@/lib/wardrobe-constants";

export interface HandleLookupEntry {
  id: number;
  legacyId: string | null;
  name: string;
  finishes: { id: number; legacyId: string | null; name: string }[];
}

export interface DoorMetrics {
  doubleDoorCount: number;
  singleDoorCount: number;
  mirrorDoorCount: number;
  drawerStyleDoorCount: number;
  maxDoorHeight: number; // cm, 0 if no doors
  minDoorHeight: number; // cm, 0 if no doors
  handleCount: number; // 1/single, 2/double, 0/drawerStyle
  handleName: string;
  handleFinishName: string;
}

const EMPTY_METRICS: DoorMetrics = {
  doubleDoorCount: 0,
  singleDoorCount: 0,
  mirrorDoorCount: 0,
  drawerStyleDoorCount: 0,
  maxDoorHeight: 0,
  minDoorHeight: 0,
  handleCount: 0,
  handleName: "",
  handleFinishName: "",
};

export function computeDoorMetrics(
  snapshot: Record<string, unknown>,
  handleLookup?: HandleLookupEntry[],
): DoorMetrics {
  const doorGroups = (snapshot?.doorGroups as any[]) ?? [];
  if (doorGroups.length === 0) {
    return {
      ...EMPTY_METRICS,
      ...resolveHandleNames(snapshot, handleLookup),
    };
  }

  // Parse wardrobe geometry (same as calcCutList.ts:148-220)
  const width = Number(snapshot.width ?? 0);
  const height = Number(snapshot.height ?? 0);
  const hasBase = Boolean(snapshot.hasBase);
  const baseH = hasBase ? Number(snapshot.baseHeight ?? 0) / 100 : 0; // meters
  const panelThickness = Number(snapshot.panelThickness ?? 18);
  const t = panelThickness / 1000; // meters
  const w = width / 100; // meters
  const h = height / 100; // meters

  if (w <= 0 || h <= 0)
    return { ...EMPTY_METRICS, ...resolveHandleNames(snapshot, handleLookup) };

  // Build columns (same as calcCutList.ts:209-222)
  const verticalBoundaries = (snapshot.verticalBoundaries as number[]) ?? [];
  const columns = buildBlocksX(
    w,
    verticalBoundaries.length > 0 ? verticalBoundaries : undefined,
  );

  // Module split logic (same as calcCutList.ts:225-234)
  const needsModuleSplit = h > TARGET_BOTTOM_HEIGHT;
  let bottomModuleH = h;
  if (needsModuleSplit) {
    bottomModuleH =
      h - TARGET_BOTTOM_HEIGHT < MIN_TOP_HEIGHT
        ? h - MIN_TOP_HEIGHT
        : TARGET_BOTTOM_HEIGHT;
  }
  const calculatedModuleBoundaryY = -h / 2 + bottomModuleH;

  const columnHorizontalBoundaries =
    (snapshot.columnHorizontalBoundaries as Record<number, number[]>) ?? {};
  const columnModuleBoundaries =
    (snapshot.columnModuleBoundaries as Record<number, number | null>) ?? {};
  const columnTopModuleShelves =
    (snapshot.columnTopModuleShelves as Record<number, number[]>) ?? {};

  // Count door types and compute heights
  let doubleDoorCount = 0;
  let singleDoorCount = 0;
  let mirrorDoorCount = 0;
  let drawerStyleDoorCount = 0;
  let handleCount = 0;
  let maxDoorHeight = 0;
  let minDoorHeight = Infinity;

  for (const group of doorGroups) {
    const type = group.type as string;
    if (!type || type === "none") continue;

    // Count by type
    if (type === "double" || type === "doubleMirror") {
      doubleDoorCount++;
      handleCount += 2;
    } else if (type === "drawerStyle") {
      drawerStyleDoorCount++;
      // No handles for drawerStyle (push-to-open)
    } else {
      // left, right, leftMirror, rightMirror
      singleDoorCount++;
      handleCount += 1;
    }
    if (type.toLowerCase().includes("mirror")) {
      mirrorDoorCount++;
    }

    // Compute door height
    const doorH = computeDoorGroupHeight(
      group,
      columns,
      t,
      baseH,
      h,
      calculatedModuleBoundaryY,
      needsModuleSplit,
      columnHorizontalBoundaries,
      columnModuleBoundaries,
      columnTopModuleShelves,
    );
    if (doorH > 0) {
      maxDoorHeight = Math.max(maxDoorHeight, doorH);
      minDoorHeight = Math.min(minDoorHeight, doorH);
    }
  }

  if (minDoorHeight === Infinity) minDoorHeight = 0;

  // Round to 1 decimal
  maxDoorHeight = Math.round(maxDoorHeight * 10) / 10;
  minDoorHeight = Math.round(minDoorHeight * 10) / 10;

  return {
    doubleDoorCount,
    singleDoorCount,
    mirrorDoorCount,
    drawerStyleDoorCount,
    maxDoorHeight,
    minDoorHeight,
    handleCount,
    ...resolveHandleNames(snapshot, handleLookup),
  };
}

function resolveHandleNames(
  snapshot: Record<string, unknown>,
  handleLookup?: HandleLookupEntry[],
): { handleName: string; handleFinishName: string } {
  if (!handleLookup || handleLookup.length === 0) {
    return { handleName: "", handleFinishName: "" };
  }

  const globalHandleId = String(snapshot.globalHandleId ?? "");
  const globalHandleFinish = String(snapshot.globalHandleFinish ?? "");

  const handle = handleLookup.find(
    (h) => h.legacyId === globalHandleId || String(h.id) === globalHandleId,
  );
  const handleName = handle?.name ?? "";

  let handleFinishName = "";
  if (handle) {
    const finish = handle.finishes.find(
      (f) =>
        f.legacyId === globalHandleFinish ||
        String(f.id) === globalHandleFinish,
    );
    handleFinishName = finish?.name ?? "";
  }

  return { handleName, handleFinishName };
}

/**
 * Compute a single door group's height in cm.
 * Mirrors the algorithm from calcCutList.ts:593-635 and :893-944.
 */
function computeDoorGroupHeight(
  group: { compartments: string[]; column: string },
  columns: { start: number; end: number; width: number }[],
  t: number,
  baseH: number,
  h: number,
  calculatedModuleBoundaryY: number,
  needsModuleSplit: boolean,
  columnHorizontalBoundaries: Record<number, number[]>,
  columnModuleBoundaries: Record<number, number | null>,
  columnTopModuleShelves: Record<number, number[]>,
): number {
  const colIdx = group.column.charCodeAt(0) - 65;
  if (colIdx < 0 || colIdx >= columns.length) return 0;

  // Resolve module boundary for this column (same as calcCutList.ts:880-890)
  const storeModuleBoundary = columnModuleBoundaries[colIdx];
  const hasStoreModuleBoundary =
    storeModuleBoundary !== undefined && storeModuleBoundary !== null;
  const moduleBoundary = hasStoreModuleBoundary
    ? storeModuleBoundary
    : needsModuleSplit
      ? calculatedModuleBoundaryY
      : null;
  const hasModuleSplit = moduleBoundary !== null;

  // Bottom module Y boundaries (same as calcCutList.ts:895-905)
  const bottomShelfYs = columnHorizontalBoundaries[colIdx] ?? [];
  const bottomNumComps = bottomShelfYs.length + 1;
  const bottomYStart = -h / 2 + t + baseH;
  const bottomYEnd = hasModuleSplit ? moduleBoundary - t : h / 2 - t;
  const bottomSortedYs = [...bottomShelfYs].sort((a, b) => a - b);
  const bottomAllYs = [bottomYStart, ...bottomSortedYs, bottomYEnd];

  // Top module Y boundaries (same as calcCutList.ts:929-937)
  let topAllYs: number[] = [];
  if (hasModuleSplit) {
    const topShelfYs = columnTopModuleShelves[colIdx] ?? [];
    const topYStart = moduleBoundary + t;
    const topYEnd = h / 2 - t;
    const topSortedYs = [...topShelfYs].sort((a, b) => a - b);
    topAllYs = [topYStart, ...topSortedYs, topYEnd];
  }

  // Helper to get compartment Y bounds from a compKey like "A1", "A2", etc.
  function getCompBounds(compKey: string): { yStart: number; yEnd: number } {
    const match = compKey.match(/^[A-Z]+(\d+)/);
    if (!match) return { yStart: 0, yEnd: 0 };
    const compNum = parseInt(match[1]) - 1; // 0-based

    if (hasModuleSplit && compNum >= bottomNumComps) {
      // Top module compartment
      const topIdx = compNum - bottomNumComps;
      if (topIdx >= 0 && topIdx < topAllYs.length - 1) {
        return { yStart: topAllYs[topIdx], yEnd: topAllYs[topIdx + 1] };
      }
    } else {
      // Bottom module compartment
      if (compNum >= 0 && compNum < bottomAllYs.length - 1) {
        return { yStart: bottomAllYs[compNum], yEnd: bottomAllYs[compNum + 1] };
      }
    }
    return { yStart: 0, yEnd: 0 };
  }

  // Single compartment door
  if (group.compartments.length === 1) {
    const parsed = parseSubCompKey(group.compartments[0]);
    if (!parsed) return 0;
    const bounds = getCompBounds(parsed.compKey);
    const heightM = Math.max(bounds.yEnd - bounds.yStart - t, 0);
    return heightM * 100;
  }

  // Multi-compartment door: check if all sub-comps of same base (calcCutList.ts:596-605)
  const allSameBase = group.compartments.every((cKey: string) => {
    const parsed = parseSubCompKey(cKey);
    const firstParsed = parseSubCompKey(group.compartments[0]);
    return parsed && firstParsed && parsed.compKey === firstParsed.compKey;
  });

  if (allSameBase) {
    const parsed = parseSubCompKey(group.compartments[0]);
    if (!parsed) return 0;
    const bounds = getCompBounds(parsed.compKey);
    return Math.max(bounds.yEnd - bounds.yStart - t, 0) * 100;
  }

  // Multiple different base compartments - sum unique heights (calcCutList.ts:607-635)
  const uniqueBaseKeys = new Set<string>();
  let totalH = 0;
  for (const cKey of group.compartments) {
    const parsed = parseSubCompKey(cKey);
    const baseKey = parsed ? parsed.compKey : cKey;
    if (uniqueBaseKeys.has(baseKey)) continue;
    uniqueBaseKeys.add(baseKey);

    const bounds = getCompBounds(baseKey);
    totalH += Math.max(bounds.yEnd - bounds.yStart - t, 0);
  }
  return totalH * 100;
}
