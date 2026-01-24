// Segment thresholds
export const MAX_SEGMENT_X = 100 / 100; // 1.0m - max element width
export const TARGET_BOTTOM_HEIGHT = 200 / 100; // 2.0m - height split threshold
export const MIN_TOP_HEIGHT = 10 / 100; // 0.1m - min top module height
export const MAX_MODULE_HEIGHT = 200 / 100; // 2.0m - max height for any single module (top or bottom)

// Drawer dimensions
export const DRAWER_HEIGHT = 10 / 100; // 10cm
export const DRAWER_GAP = 1 / 100; // 1cm

// Drag constraints
export const MIN_DRAG_GAP = 10 / 100; // 10cm minimum between shelves/dividers
export const MIN_SEGMENT = 10 / 100; // 10cm minimum segment size (same as MIN_DRAG_GAP)
export const MAX_SEGMENT_Y = 200 / 100; // 2.0m - max vertical segment (same as TARGET_BOTTOM_HEIGHT)

// ============================================
// SHELF CONSTRAINTS CONFIG
// Edit these values to change shelf constraints
// ============================================

// Maximum number of horizontal shelves per column
export const MAX_SHELVES_PER_COLUMN = 14;

// Maximum column height (cm) - also max compartment height
export const MAX_COLUMN_HEIGHT_CM = 280;

// Minimum column height per number of shelves (in cm)
// Key = number of shelves, Value = minimum column height in cm
// Values not defined here use formula: 21 + (n * 12)
export const MIN_HEIGHT_BY_SHELVES: Record<number, number> = {
  1: 29,
  2: 45,
  3: 57,
  4: 69,
  5: 81,
  6: 93,
  // 7-14 use formula: 21 + (n * 12)
};

/**
 * Get minimum column height for given number of shelves
 * @param numShelves Number of horizontal shelves (0 = no shelves, 1 compartment)
 * @returns Minimum column height in cm
 */
export function getMinColumnHeightCm(numShelves: number): number {
  if (numShelves === 0) return 29; // No shelves = 1 compartment
  if (MIN_HEIGHT_BY_SHELVES[numShelves] !== undefined) {
    return MIN_HEIGHT_BY_SHELVES[numShelves];
  }
  // Formula for values not explicitly defined (7-14)
  return 21 + numShelves * 12;
}

/**
 * Get maximum number of shelves that can fit in given column height
 * @param columnHeightCm Column height in cm
 * @returns Maximum number of shelves
 */
export function getMaxShelvesForHeight(columnHeightCm: number): number {
  for (let n = MAX_SHELVES_PER_COLUMN; n >= 1; n--) {
    if (columnHeightCm >= getMinColumnHeightCm(n)) {
      return n;
    }
  }
  return 0;
}

/**
 * Calculate evenly-distributed shelf Y positions (space-around)
 * @param columnHeightM Column height in meters
 * @param shelfCount Number of shelves to distribute
 * @param panelThicknessM Panel thickness in meters
 * @returns Array of Y positions in meters (from floor)
 */
export function distributeShelvesEvenly(
  columnHeightM: number,
  shelfCount: number,
  panelThicknessM: number,
): number[] {
  if (shelfCount <= 0) return [];

  // Usable height = column height minus top and bottom panels
  const usableHeight = columnHeightM - 2 * panelThicknessM;

  // Space between shelves (space-around = equal gaps including top/bottom)
  const numGaps = shelfCount + 1;
  const gapSize = usableHeight / numGaps;

  const positions: number[] = [];
  for (let i = 1; i <= shelfCount; i++) {
    // Y position from floor: bottom panel + i gaps
    positions.push(panelThicknessM + i * gapSize);
  }
  return positions;
}
