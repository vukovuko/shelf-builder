import {
  MAX_SEGMENT_X,
  TARGET_BOTTOM_HEIGHT,
  MIN_TOP_HEIGHT,
} from "./wardrobe-constants";

/**
 * Converts 0-based index to Excel-style column letters.
 * 0 -> "A", 25 -> "Z", 26 -> "AA"
 */
export function toLetters(num: number): string {
  let n = num + 1;
  let s = "";
  while (n > 0) {
    const rem = (n - 1) % 26;
    s = String.fromCharCode(65 + rem) + s;
    n = Math.floor((n - 1) / 26);
  }
  return s;
}

/**
 * Split wardrobe width into blocks of max 100cm each.
 * If customBoundaries is provided, uses those X positions for seams.
 * Otherwise, auto-calculates equal segments.
 *
 * @param w - Total width in meters
 * @param customBoundaries - Optional array of X positions (in meters from center)
 */
export function buildBlocksX(
  w: number,
  customBoundaries?: number[],
): { start: number; end: number; width: number }[] {
  // If custom boundaries provided and not empty, use them
  if (customBoundaries && customBoundaries.length > 0) {
    // Sort boundaries to ensure correct order
    const sorted = [...customBoundaries].sort((a, b) => a - b);
    // Create full list of edges: left edge, custom boundaries, right edge
    const allEdges = [-w / 2, ...sorted, w / 2];
    // Create blocks from consecutive edges
    return allEdges.slice(0, -1).map((start, i) => ({
      start,
      end: allEdges[i + 1],
      width: allEdges[i + 1] - start,
    }));
  }

  // Auto-calculate equal segments (original logic)
  const nBlocksX = Math.max(1, Math.ceil(w / MAX_SEGMENT_X));
  const segWX = w / nBlocksX;
  return Array.from({ length: nBlocksX }, (_, i) => {
    const start = -w / 2 + i * segWX;
    return { start, end: start + segWX, width: segWX };
  });
}

/**
 * Get default equal boundaries for a given width.
 * Returns positions of internal seams (not the outer edges).
 */
export function getDefaultBoundariesX(widthMeters: number): number[] {
  const nBlocks = Math.max(1, Math.ceil(widthMeters / MAX_SEGMENT_X));
  if (nBlocks <= 1) return []; // No internal boundaries needed

  const segW = widthMeters / nBlocks;
  // Internal boundaries are between blocks (not at edges)
  return Array.from(
    { length: nBlocks - 1 },
    (_, i) => -widthMeters / 2 + (i + 1) * segW,
  );
}

/**
 * Split wardrobe height into vertical modules.
 * If h > 200cm, splits into bottom (200cm) + top (remainder, min 10cm).
 * @param h - Total height in meters
 * @param includeLabel - Whether to include module labels
 * @param customBoundary - Custom Y position for the split (in meters from center), or null for auto
 */
export function buildModulesY(
  h: number,
  includeLabel = false,
  customBoundary?: number | null,
): { yStart: number; yEnd: number; height: number; label?: string }[] {
  if (h > TARGET_BOTTOM_HEIGHT) {
    const yStartBottom = -h / 2;
    let bottomH: number;

    if (customBoundary !== undefined && customBoundary !== null) {
      // Custom boundary is Y position from center, convert to height
      bottomH = customBoundary - yStartBottom;
      // Clamp to valid range
      bottomH = Math.max(MIN_TOP_HEIGHT, Math.min(h - MIN_TOP_HEIGHT, bottomH));
    } else {
      // Auto-calculate
      bottomH =
        h - TARGET_BOTTOM_HEIGHT < MIN_TOP_HEIGHT
          ? h - MIN_TOP_HEIGHT
          : TARGET_BOTTOM_HEIGHT;
    }
    const yEndBottom = yStartBottom + bottomH;

    return [
      {
        yStart: yStartBottom,
        yEnd: yEndBottom,
        height: bottomH,
        ...(includeLabel && { label: "BottomModule" }),
      },
      {
        yStart: yEndBottom,
        yEnd: h / 2,
        height: h / 2 - yEndBottom,
        ...(includeLabel && { label: "TopModule" }),
      },
    ];
  }
  return [
    {
      yStart: -h / 2,
      yEnd: h / 2,
      height: h,
      ...(includeLabel && { label: "SingleModule" }),
    },
  ];
}

/**
 * Split wardrobe height into vertical modules for a specific column.
 * Uses column-specific horizontal boundary if available, otherwise falls back to global.
 *
 * @param h - Total height in meters
 * @param colIndex - Column index (0, 1, 2...)
 * @param columnHorizontalBoundaries - Per-column boundaries (colIndex → Y position)
 * @param globalFallback - Global horizontal boundary to use if column has no specific boundary
 * @param includeLabel - Whether to include module labels
 */
export function buildModulesYForColumn(
  h: number,
  colIndex: number,
  columnHorizontalBoundaries: Record<number, number | null>,
  globalFallback: number | null,
  includeLabel = false,
): { yStart: number; yEnd: number; height: number; label?: string }[] {
  // Use column-specific boundary if defined, otherwise use global fallback
  const boundary =
    colIndex in columnHorizontalBoundaries
      ? columnHorizontalBoundaries[colIndex]
      : globalFallback;

  // Reuse existing buildModulesY logic
  return buildModulesY(h, includeLabel, boundary);
}

/**
 * Get all element keys (A, B, C, ...) for a given wardrobe size.
 */
export function getElementKeys(w: number, h: number): string[] {
  const blocksX = buildBlocksX(w);
  const modulesY = buildModulesY(h);
  const totalElements = blocksX.length * modulesY.length;
  return Array.from({ length: totalElements }, (_, i) => toLetters(i));
}
