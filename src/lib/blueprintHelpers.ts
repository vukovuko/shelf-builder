/**
 * Pure helper functions for BlueprintView.
 * Extracted from BlueprintView.tsx to enable unit testing and reuse.
 */

// ── Column blocks from vertical boundaries ───────────────────────────

export function buildBlocksFromBoundaries(
  widthCm: number,
  boundaries: number[] | undefined,
): { start: number; end: number; width: number }[] {
  const w = widthCm / 100; // Convert to meters for boundary comparison
  const result: { start: number; end: number; width: number }[] = [];

  if (!boundaries || boundaries.length === 0) {
    result.push({ start: 0, end: widthCm, width: widthCm });
  } else {
    const sortedBoundaries = [...boundaries].sort((a, b) => a - b);
    const boundaryCm = sortedBoundaries.map((b) => (b + w / 2) * 100);

    let prevX = 0;
    for (const bCm of boundaryCm) {
      if (bCm > prevX && bCm < widthCm) {
        result.push({ start: prevX, end: bCm, width: bCm - prevX });
        prevX = bCm;
      }
    }
    if (prevX < widthCm) {
      result.push({ start: prevX, end: widthCm, width: widthCm - prevX });
    }
  }

  return result;
}

// ── Compartment generation per column ────────────────────────────────

export interface CompartmentInfo {
  key: string;
  bottomY: number;
  topY: number;
  heightCm: number;
}

export interface GetCompartmentsParams {
  colIdx: number;
  columnHeights: Record<number, number>;
  height: number; // wardrobe height in cm
  columnHorizontalBoundaries: Record<number, number[]>;
  columnModuleBoundaries: Record<number, number | null>;
  columnTopModuleShelves: Record<number, number[]>;
  hasBase: boolean;
  baseHeight: number; // in cm
  tCm: number; // panel thickness in cm
}

const SPLIT_THRESHOLD = 2.0; // 200cm in meters

export function getCompartmentsForColumn(
  params: GetCompartmentsParams,
): CompartmentInfo[] {
  const {
    colIdx,
    columnHeights,
    height,
    columnHorizontalBoundaries,
    columnModuleBoundaries,
    columnTopModuleShelves,
    hasBase,
    baseHeight,
    tCm,
  } = params;

  const colLetter = String.fromCharCode(65 + colIdx);
  const colHCm = columnHeights[colIdx] ?? height;
  const colH = colHCm / 100; // column height in meters

  const shelves = columnHorizontalBoundaries[colIdx] || [];

  const innerBottom = hasBase ? baseHeight + tCm : tCm;
  const innerTop = colHCm - tCm;

  // Module boundary validation
  const moduleBoundary = columnModuleBoundaries[colIdx] ?? null;
  const rawModuleBoundaryYCm =
    moduleBoundary !== null ? moduleBoundary * 100 : null;
  const isValidModuleBoundary =
    rawModuleBoundaryYCm !== null &&
    rawModuleBoundaryYCm > innerBottom + tCm &&
    rawModuleBoundaryYCm < innerTop - tCm;

  const hasModuleBoundary =
    moduleBoundary !== null && colH > SPLIT_THRESHOLD && isValidModuleBoundary;

  const topModuleShelves = hasModuleBoundary
    ? columnTopModuleShelves[colIdx] || []
    : [];

  const moduleBoundaryYCm = hasModuleBoundary ? rawModuleBoundaryYCm : null;

  const compartments: CompartmentInfo[] = [];
  let compNum = 1;

  // === BOTTOM MODULE COMPARTMENTS ===
  const bottomShelfYsCm = shelves
    .map((s: number) => s * 100)
    .filter(
      (y: number) => y > innerBottom && y < (moduleBoundaryYCm ?? innerTop),
    )
    .sort((a: number, b: number) => a - b);

  const bottomModuleTop = hasModuleBoundary
    ? moduleBoundaryYCm! - tCm
    : innerTop;

  let prevY = innerBottom;

  for (const shelfY of bottomShelfYsCm) {
    if (shelfY > prevY + tCm) {
      compartments.push({
        key: `${colLetter}${compNum}`,
        bottomY: prevY,
        topY: shelfY - tCm / 2,
        heightCm: Math.round(shelfY - tCm / 2 - prevY),
      });
      compNum++;
      prevY = shelfY + tCm / 2;
    }
  }

  if (prevY < bottomModuleTop) {
    compartments.push({
      key: `${colLetter}${compNum}`,
      bottomY: prevY,
      topY: bottomModuleTop,
      heightCm: Math.round(bottomModuleTop - prevY),
    });
    compNum++;
  }

  // === TOP MODULE COMPARTMENTS ===
  if (hasModuleBoundary && moduleBoundaryYCm) {
    const topModuleBottom = moduleBoundaryYCm + tCm;

    const topShelfYsCm = topModuleShelves
      .map((s: number) => s * 100)
      .filter((y: number) => y > topModuleBottom && y < innerTop)
      .sort((a: number, b: number) => a - b);

    prevY = topModuleBottom;

    for (const shelfY of topShelfYsCm) {
      if (shelfY > prevY + tCm) {
        compartments.push({
          key: `${colLetter}${compNum}`,
          bottomY: prevY,
          topY: shelfY - tCm / 2,
          heightCm: Math.round(shelfY - tCm / 2 - prevY),
        });
        compNum++;
        prevY = shelfY + tCm / 2;
      }
    }

    if (prevY < innerTop) {
      compartments.push({
        key: `${colLetter}${compNum}`,
        bottomY: prevY,
        topY: innerTop,
        heightCm: Math.round(innerTop - prevY),
      });
    }
  }

  // Fallback: single full-height compartment
  if (compartments.length === 0) {
    compartments.push({
      key: `${colLetter}1`,
      bottomY: innerBottom,
      topY: innerTop,
      heightCm: Math.round(innerTop - innerBottom),
    });
  }

  return compartments;
}

// ── Coordinate mappers ───────────────────────────────────────────────

export function createMapY(
  frontViewY: number,
  scaledHeight: number,
  scale: number,
  height: number,
) {
  return (yFromFloorCm: number): number => {
    const clamped = Math.max(0, Math.min(height, yFromFloorCm));
    return frontViewY + scaledHeight - clamped * scale;
  };
}

export function createMapYForColumn(
  frontViewY: number,
  scaledHeight: number,
  scale: number,
  height: number,
  columnHeights: Record<number, number>,
) {
  return (yFromFloorCm: number, colIdx: number): number => {
    const colH = columnHeights[colIdx] ?? height;
    const clamped = Math.max(0, Math.min(colH, yFromFloorCm));
    return frontViewY + scaledHeight - clamped * scale;
  };
}
