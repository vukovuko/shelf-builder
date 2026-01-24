// Segment thresholds
export const MAX_SEGMENT_X = 120 / 100; // 1.2m - max element width (120cm)
export const MAX_SEGMENT_X_CM = 120; // 120cm - same as above but in cm (for UI)
export const TARGET_BOTTOM_HEIGHT = 200 / 100; // 2.0m - height split threshold
export const TARGET_BOTTOM_HEIGHT_CM = 200; // 200cm - same as above but in cm (for UI/2D)
export const MIN_TOP_HEIGHT = 10 / 100; // 0.1m - min top module height
export const MIN_TOP_HEIGHT_CM = 10; // 10cm - same as above but in cm (for UI/2D)
export const MAX_MODULE_HEIGHT = 200 / 100; // 2.0m - max height for any single module (top or bottom)
export const MAX_MODULE_HEIGHT_CM = 200; // 200cm - same as above but in cm (for UI/2D)

// Panel/door thickness defaults
export const DEFAULT_PANEL_THICKNESS_M = 18 / 1000; // 18mm = 0.018m
export const DOOR_THICKNESS_M = 18 / 1000; // 18mm door thickness

// Drawer dimensions
export const DRAWER_HEIGHT = 10 / 100; // 10cm
export const DRAWER_HEIGHT_CM = 10; // 10cm - same as above but in cm (for UI/2D)
export const DRAWER_GAP = 1 / 100; // 1cm
export const DRAWER_GAP_CM = 1; // 1cm - same as above but in cm (for UI/2D)

// Drag constraints
export const MIN_DRAG_GAP = 10 / 100; // 10cm minimum between shelves/dividers
export const MIN_SEGMENT = 10 / 100; // 10cm minimum segment size (same as MIN_DRAG_GAP)
export const MAX_SEGMENT_Y = 200 / 100; // 2.0m - max vertical segment (same as TARGET_BOTTOM_HEIGHT)

// Compartment subdivision limits (for Step 2 inner dividers)
export const MIN_DIVIDER_WIDTH_CM = 15; // Min 15cm per vertical section
export const MIN_SHELF_HEIGHT_CM = 12; // Min 12cm per horizontal section
export const MAX_VERTICAL_DIVIDERS = 7; // Max 7 dividers = 8 sections
export const MAX_HORIZONTAL_SHELVES_INNER = 10; // Max 10 shelves within a compartment = 11 sections

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
