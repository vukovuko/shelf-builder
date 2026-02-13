import posthog from "posthog-js";
import { create } from "zustand";
import {
  MAX_SHELVES_PER_COLUMN,
  getMaxShelvesForHeight,
  distributeShelvesEvenly,
  TARGET_BOTTOM_HEIGHT,
  MIN_TOP_HEIGHT,
  MAX_MODULE_HEIGHT,
  DEFAULT_PANEL_THICKNESS_M,
  MIN_DRAG_GAP,
  MIN_SHELF_HEIGHT_CM,
} from "./wardrobe-constants";
import { getDefaultBoundariesX } from "./wardrobe-utils";
import { reconcileWardrobeState } from "./reconcileWardrobeState";

// Define the view modes for the application
export type ViewMode = "3D" | "2D" | "Sizing";

// Material type for database materials
export interface Material {
  id: number;
  name: string;
  productCode: string | null;
  price: number;
  costPrice: number;
  img: string | null;
  thickness: number | null;
  stock: number | null;
  categories: string[];
  published: boolean;
}

// Handle finish type for database handle finishes
export interface HandleFinish {
  id: number;
  handleId: number;
  legacyId: string | null;
  name: string;
  image: string | null;
  price: number; // Selling price in RSD (prodajna cena)
  costPrice: number; // Cost price in RSD (nabavna cena)
}

// Handle type for database handles
export interface Handle {
  id: number;
  legacyId: string | null;
  name: string;
  description: string | null;
  mainImage: string | null;
  published: boolean;
  finishes: HandleFinish[];
}

// Door configuration options per element (UI only for now)
export type DoorOption =
  | "none"
  | "left"
  | "right"
  | "double"
  | "leftMirror"
  | "rightMirror"
  | "doubleMirror"
  | "drawerStyle";

// Door group - spans multiple compartments with one door
export interface DoorGroup {
  id: string; // Unique ID (e.g., "door-A1-A3")
  type: DoorOption; // "left", "right", "double", etc.
  compartments: string[]; // ["A1", "A2", "A3"] - ordered bottom to top
  column: string; // "A" - column letter (for validation)
  // Per-door settings (optional - uses global if not set)
  materialId?: number; // Material ID for this specific door
  handleId?: string; // Handle ID for this specific door (e.g., "handle_1")
  handleFinish?: string; // Handle finish for this specific door (e.g., "chrome")
}

// Door settings mode
export type DoorSettingsMode = "global" | "per-door";

// Parsed sub-compartment key result
export interface ParsedSubCompKey {
  compKey: string; // Base compartment key (e.g., "A1")
  column: string; // Column letter (e.g., "A")
  compIdx: number; // Compartment index (e.g., 1)
  sectionIdx: number; // Section index within compartment (0 if no subdivisions)
  spaceIdx: number; // Space index within section (0 if no subdivisions)
  isSubComp: boolean; // true if key has sub-indices (e.g., "A1.0.1")
}

/**
 * Parse a compartment or sub-compartment key.
 * Examples:
 * - "A1" → { compKey: "A1", column: "A", compIdx: 1, sectionIdx: 0, spaceIdx: 0, isSubComp: false }
 * - "A1.0.2" → { compKey: "A1", column: "A", compIdx: 1, sectionIdx: 0, spaceIdx: 2, isSubComp: true }
 */
export function parseSubCompKey(key: string): ParsedSubCompKey | null {
  const parts = key.split(".");

  // Parse base compartment key (e.g., "A1")
  const baseMatch = parts[0].match(/^([A-Z]+)(\d+)$/);
  if (!baseMatch) return null;

  const column = baseMatch[1];
  const compIdx = parseInt(baseMatch[2], 10);
  const compKey = parts[0];

  if (parts.length === 1) {
    // Simple key like "A1"
    return {
      compKey,
      column,
      compIdx,
      sectionIdx: 0,
      spaceIdx: 0,
      isSubComp: false,
    };
  }

  if (parts.length === 3) {
    // Sub-compartment key like "A1.0.2"
    const sectionIdx = parseInt(parts[1], 10);
    const spaceIdx = parseInt(parts[2], 10);
    if (isNaN(sectionIdx) || isNaN(spaceIdx)) return null;

    return {
      compKey,
      column,
      compIdx,
      sectionIdx,
      spaceIdx,
      isSubComp: true,
    };
  }

  return null; // Invalid format
}

interface ElementConfig {
  columns: number; // number of compartments in this element (dividers + 1)
  rowCounts: number[]; // shelves per compartment
  drawerCounts?: number[]; // drawers per compartment (max = rowCounts[i] + 1)
  drawersExternal?: boolean[]; // true = external (facade), false = internal (behind door)
}

interface CompartmentExtras {
  verticalDivider?: boolean;
  drawers?: boolean;
  drawersCount?: number; // number of drawers for this element (when drawers is enabled)
  rod?: boolean;
  led?: boolean;
}

export interface ShelfState {
  width: number;
  height: number;
  depth: number;
  panelThickness: number;
  numberOfColumns: number;
  columnWidths: number[]; // New: array of column widths
  viewMode: ViewMode;
  rowCounts: number[]; // New: number of shelves per column
  selectedMaterial: string;
  selectedMaterialId: number;
  selectedFrontMaterialId?: number;
  selectedBackMaterialId?: number;
  showDimensions: boolean;
  // Materials from database
  materials: Material[];
  setMaterials: (materials: Material[]) => void;
  // Handles from database
  handles: Handle[];
  setHandles: (handles: Handle[]) => void;
  setWidth: (width: number) => void;
  setHeight: (height: number) => void;
  setDepth: (depth: number) => void;
  setPanelThickness: (thickness: number) => void;
  setNumberOfColumns: (columns: number) => void;
  setColumnWidth: (index: number, width: number) => void; // New
  setViewMode: (mode: ViewMode) => void;
  setRowCount: (index: number, count: number) => void;
  setSelectedMaterial: (material: string) => void;
  setSelectedMaterialId: (id: number) => void;
  setSelectedFrontMaterialId: (id: number) => void;
  setSelectedBackMaterialId: (id: number) => void;
  setShowDimensions: (show: boolean) => void;
  showEdgesOnly: boolean;
  setShowEdgesOnly: (show: boolean) => void;
  // One-shot camera fit trigger
  fitRequestId: number;
  triggerFitToView: () => void;
  // Force front view (for Ivice download - resets camera after Bounds fit)
  forceFrontViewId: number;
  triggerForceFrontView: () => void;
  // Per-element configuration
  selectedElementKey: string | null;
  setSelectedElementKey: (key: string | null) => void;
  elementConfigs: Record<string, ElementConfig>;
  setElementColumns: (key: string, columns: number) => void;
  setElementRowCount: (key: string, index: number, count: number) => void;
  setElementDrawerCount: (key: string, index: number, count: number) => void;
  setElementDrawerExternal: (
    key: string,
    index: number,
    isExternal: boolean,
  ) => void;
  // Base (plinth)
  hasBase: boolean;
  baseHeight: number; // in cm
  setHasBase: (val: boolean) => void;
  setBaseHeight: (val: number) => void;
  // Extras mode and selections
  extrasMode: boolean;
  setExtrasMode: (val: boolean) => void;
  selectedCompartmentKey: string | null;
  setSelectedCompartmentKey: (key: string | null) => void;
  hoveredCompartmentKey: string | null;
  setHoveredCompartmentKey: (key: string | null) => void;
  compartmentExtras: Record<string, CompartmentExtras>;
  toggleCompVerticalDivider: (key: string) => void;
  toggleCompDrawers: (key: string) => void;
  toggleCompRod: (key: string) => void;
  toggleCompLed: (key: string) => void;
  setCompDrawersCount: (key: string, count: number) => void;
  // Doors menu UI state
  selectedDoorElementKey: string | null;
  setSelectedDoorElementKey: (key: string | null) => void;
  doorSelections: Record<string, DoorOption>;
  setDoorOption: (key: string, option: DoorOption) => void;
  showDoors: boolean;
  setShowDoors: (show: boolean) => void;
  // Door multi-select drag state (Step 5)
  doorSelectionDragging: boolean;
  doorSelectionStart: string | null;
  doorSelectionCurrent: string | null;
  selectedDoorCompartments: string[];
  startDoorSelection: (compKey: string) => void;
  updateDoorSelectionDrag: (compKey: string) => void;
  endDoorSelection: () => void;
  clearDoorSelection: () => void;
  setDoorForSelection: (type: DoorOption) => void;
  // Door groups (span multiple compartments)
  doorGroups: DoorGroup[];
  getDoorGroupForCompartment: (compKey: string) => DoorGroup | null;
  removeDoorGroup: (groupId: string) => void;
  // Per-door material and handle settings
  globalHandleId: string; // Default handle for all doors (e.g., "handle_1")
  globalHandleFinish: string; // Default handle finish for all doors (e.g., "chrome")
  doorSettingsMode: DoorSettingsMode; // Toggle between global and per-door
  setDoorMaterial: (groupId: string, materialId: number) => void;
  setDoorHandle: (groupId: string, handleId: string) => void;
  setDoorHandleFinish: (groupId: string, finish: string) => void;
  setGlobalHandle: (handleId: string) => void;
  setGlobalHandleFinish: (finish: string) => void;
  setDoorSettingsMode: (mode: DoorSettingsMode) => void;
  showInfoButtons: boolean;
  setShowInfoButtons: (show: boolean) => void;
  // Track which accordion step is open (for Step 2 mode: hide labels, show circles)
  activeAccordionStep: string | null;
  setActiveAccordionStep: (step: string | null) => void;
  // Track loaded wardrobe for update functionality
  loadedWardrobeId: string | null;
  loadedWardrobeIsModel: boolean;
  setLoadedWardrobe: (id: string | null, isModel: boolean) => void;
  clearLoadedWardrobe: () => void;
  // Track order context when editing from order detail page
  fromOrderId: string | null;
  fromOrderNumber: number | null;
  setFromOrder: (orderId: string | null, orderNumber: number | null) => void;
  clearFromOrder: () => void;
  // Track wardrobe context when editing from wardrobe preview page
  fromWardrobeId: string | null;
  fromWardrobeName: string | null;
  setFromWardrobe: (
    wardrobeId: string | null,
    wardrobeName: string | null,
  ) => void;
  clearFromWardrobe: () => void;
  // Track last saved snapshot for unsaved changes detection
  lastSavedSnapshot: Record<string, unknown> | null;
  setLastSavedSnapshot: (snapshot: Record<string, unknown> | null) => void;
  // Save operation state for UI feedback
  isSaving: boolean;
  setIsSaving: (val: boolean) => void;
  lastSaveTime: number | null; // Unix timestamp of last successful save
  setLastSaveTime: (time: number | null) => void;
  // Vertical structural boundaries (seam X positions in meters from center)
  // Empty array = auto-calculate equal segments
  // These seams span FULL HEIGHT of the wardrobe
  verticalBoundaries: number[];
  setVerticalBoundary: (index: number, x: number) => void;
  setVerticalBoundaries: (boundaries: number[]) => void;
  resetVerticalBoundaries: () => void;
  // Per-column horizontal boundaries (Y positions of horizontal shelves in meters)
  // Key: column index (0, 1, 2...), Value: array of Y positions (sorted bottom to top)
  // Max shelves per column defined in wardrobe-constants.ts (MAX_SHELVES_PER_COLUMN)
  columnHorizontalBoundaries: Record<number, number[]>;
  setColumnHorizontalBoundaries: (
    colIndex: number,
    boundaries: number[],
  ) => void;
  addColumnShelf: (colIndex: number, y: number) => void;
  removeColumnShelf: (colIndex: number, shelfIndex: number) => void;
  moveColumnShelf: (colIndex: number, shelfIndex: number, newY: number) => void;
  setColumnShelfCount: (
    colIndex: number,
    count: number,
    panelThicknessM: number,
  ) => void;
  resetColumnHorizontalBoundaries: () => void;
  // Track if dragging is in progress (to disable OrbitControls)
  isDragging: boolean;
  setIsDragging: (val: boolean) => void;
  // Per-column heights (in CM, default = global height)
  columnHeights: Record<number, number>;
  setColumnHeight: (colIdx: number, heightCm: number) => void;
  resetColumnHeights: () => void;
  // Hovered column for bottom bar controls
  hoveredColumnIndex: number | null;
  setHoveredColumnIndex: (idx: number | null) => void;
  // Selected column for mobile tap-to-select (persists until tapped elsewhere)
  selectedColumnIndex: number | null;
  setSelectedColumnIndex: (idx: number | null) => void;
  // Per-column module boundaries (Y position where modules split, in meters)
  // null = no module split (height <= 200cm)
  // number = Y position of module boundary
  columnModuleBoundaries: Record<number, number | null>;
  setColumnModuleBoundary: (colIdx: number, y: number | null) => void;
  moveColumnModuleBoundary: (colIdx: number, newY: number) => void;
  // Per-column top module shelves (Y positions in meters, only valid when module boundary exists)
  columnTopModuleShelves: Record<number, number[]>;
  setColumnTopModuleShelfCount: (
    colIdx: number,
    count: number,
    panelThicknessM: number,
  ) => void;
  moveTopModuleShelf: (
    colIdx: number,
    shelfIndex: number,
    newY: number,
  ) => void;
  // Preview mode - disables all editing controls in admin preview pages
  isPreviewMode: boolean;
  setIsPreviewMode: (val: boolean) => void;
  // Reset store to initial defaults (for loading fresh wardrobes in admin preview)
  resetToDefaults: () => void;
}

/**
 * Validates inner shelf configs (elementConfigs.rowCounts) for a range of compartments.
 * Clears rowCounts when the compartment height can't fit them
 * (each inner space needs at least MIN_SHELF_HEIGHT_CM = 12cm).
 *
 * @param configs - Current elementConfigs
 * @param colLetter - Column letter (A, B, C...)
 * @param compStartIdx - 0-based start index (0 for bottom module, bottomCompartmentCount for top)
 * @param boundariesM - Ordered array of Y boundaries in meters [bottom, shelf1, shelf2, ..., top]
 *                       where each pair defines a compartment
 */
function validateInnerShelfConfigs(
  configs: Record<string, ElementConfig>,
  colLetter: string,
  compStartIdx: number,
  boundariesM: number[],
): Record<string, ElementConfig> {
  let result = configs;

  for (let i = 0; i < boundariesM.length - 1; i++) {
    const compKey = `${colLetter}${compStartIdx + i + 1}`;
    const compHeightCm = (boundariesM[i + 1] - boundariesM[i]) * 100;
    const cfg = result[compKey];

    if (!cfg?.rowCounts) continue;

    const maxShelves = Math.max(
      0,
      Math.floor(compHeightCm / MIN_SHELF_HEIGHT_CM) - 1,
    );
    if (cfg.rowCounts.some((count: number) => count > maxShelves)) {
      result = {
        ...result,
        [compKey]: { ...cfg, rowCounts: cfg.rowCounts.map(() => 0) },
      };
    }
  }

  return result;
}

/**
 * Computes the inner usable height (in cm) of a compartment by its key (e.g. "A1", "B3").
 * Handles both bottom and top module compartments.
 */
function getCompartmentHeightCm(
  compKey: string,
  state: {
    height: number;
    hasBase: boolean;
    baseHeight: number;
    columnHeights: Record<number, number>;
    columnHorizontalBoundaries: Record<number, number[]>;
    columnModuleBoundaries: Record<number, number | null>;
    columnTopModuleShelves: Record<number, number[]>;
  },
): number {
  const colLetter = compKey.match(/^[A-Z]+/)?.[0] ?? "A";
  const rowNum = parseInt(compKey.match(/\d+$/)?.[0] ?? "1", 10);
  const colIdx = colLetter.charCodeAt(0) - 65;
  const t = DEFAULT_PANEL_THICKNESS_M;
  const baseH = state.hasBase ? state.baseHeight / 100 : 0;

  // NaN-safe lookups: ?? doesn't catch NaN, so check explicitly
  const colHRaw = state.columnHeights[colIdx];
  const colH =
    (colHRaw != null && !isNaN(colHRaw) ? colHRaw : state.height) / 100;
  const shelves = state.columnHorizontalBoundaries[colIdx] || [];
  const moduleBoundaryRaw = state.columnModuleBoundaries[colIdx];
  const moduleBoundary =
    moduleBoundaryRaw != null && !isNaN(moduleBoundaryRaw)
      ? moduleBoundaryRaw
      : null;
  const hasModule = moduleBoundary !== null && colH > TARGET_BOTTOM_HEIGHT;
  const bottomCompCount = shelves.length + 1;
  const topShelves = hasModule
    ? state.columnTopModuleShelves[colIdx] || []
    : [];

  const compIdx = rowNum - 1;
  const isTopModule = hasModule && compIdx >= bottomCompCount;

  let bottomY: number;
  let topY: number;

  if (isTopModule) {
    const topIdx = compIdx - bottomCompCount;
    bottomY = topIdx === 0 ? moduleBoundary + t : topShelves[topIdx - 1];
    topY = topIdx === topShelves.length ? colH - t : topShelves[topIdx];
  } else {
    bottomY = compIdx === 0 ? baseH + t : shelves[compIdx - 1];
    if (hasModule && compIdx === bottomCompCount - 1) {
      topY = moduleBoundary - t;
    } else if (compIdx === shelves.length) {
      topY = colH - t;
    } else {
      topY = shelves[compIdx];
    }
  }

  const result = Math.round((topY - bottomY) * 100);
  return isNaN(result) ? 0 : result;
}

export const useShelfStore = create<ShelfState>((set) => ({
  width: 210,
  height: 240,
  depth: 60,
  panelThickness: 2,
  numberOfColumns: 2,
  columnWidths: [1, 1], // Default to 1 for each column
  viewMode: "3D",
  rowCounts: [0, 0], // Default 0 shelf per column
  selectedMaterial: "default", // or your default material key
  selectedMaterialId: 1, // default to first material
  selectedFrontMaterialId: undefined, // front/door material (Lica/Vrata)
  selectedBackMaterialId: undefined,
  showDimensions: true,
  // Materials from database
  materials: [],
  setMaterials: (materials) =>
    set((state) => {
      // Auto-select first material for each category type if not already set or invalid
      const validIds = new Set(materials.map((m) => m.id));

      // Find first material for each category type
      const firstKorpusMaterial = materials.find((m) =>
        m.categories.some(
          (c) =>
            c.toLowerCase().includes("korpus") ||
            c.toLowerCase().includes("18mm"),
        ),
      );
      const firstFrontMaterial = materials.find((m) =>
        m.categories.some(
          (c) =>
            c.toLowerCase().includes("lica") ||
            c.toLowerCase().includes("vrata"),
        ),
      );
      const firstBackMaterial = materials.find((m) =>
        m.categories.some(
          (c) =>
            c.toLowerCase().includes("leđa") ||
            c.toLowerCase().includes("ledja"),
        ),
      );

      // Fallback to first material if category not found
      const fallbackId = materials.length > 0 ? materials[0].id : 1;

      const selectedMaterialId = validIds.has(state.selectedMaterialId)
        ? state.selectedMaterialId
        : (firstKorpusMaterial?.id ?? fallbackId);

      const selectedFrontMaterialId =
        state.selectedFrontMaterialId &&
        validIds.has(state.selectedFrontMaterialId)
          ? state.selectedFrontMaterialId
          : (firstFrontMaterial?.id ?? fallbackId);

      const selectedBackMaterialId =
        state.selectedBackMaterialId &&
        validIds.has(state.selectedBackMaterialId)
          ? state.selectedBackMaterialId
          : firstBackMaterial?.id;

      return {
        materials,
        selectedMaterialId,
        selectedFrontMaterialId,
        selectedBackMaterialId,
      };
    }),
  // Handles from database
  handles: [],
  setHandles: (handles) => set({ handles }),
  setWidth: (newWidth) =>
    set((state) => {
      const newWidthM = newWidth / 100;

      // Calculate correct boundaries for new width (auto column count based on 120cm max)
      const newBoundaries = getDefaultBoundariesX(newWidthM);
      const newColumnCount = newBoundaries.length + 1;
      const oldColumnCount = state.verticalBoundaries.length + 1;

      // Track per-column data that may need updating
      let newColumnHorizontalBoundaries = state.columnHorizontalBoundaries;
      let newColumnHeights = state.columnHeights;
      let newColumnModuleBoundaries = state.columnModuleBoundaries;
      let newColumnTopModuleShelves = state.columnTopModuleShelves;

      if (newColumnCount < oldColumnCount) {
        // Columns decreased - clean up data for removed columns
        newColumnHorizontalBoundaries = {};
        newColumnHeights = {};
        newColumnModuleBoundaries = {};
        newColumnTopModuleShelves = {};
        for (let i = 0; i < newColumnCount; i++) {
          if (state.columnHorizontalBoundaries[i]) {
            newColumnHorizontalBoundaries[i] =
              state.columnHorizontalBoundaries[i];
          }
          if (state.columnHeights[i] !== undefined) {
            newColumnHeights[i] = state.columnHeights[i];
          }
          if (state.columnModuleBoundaries[i] !== undefined) {
            newColumnModuleBoundaries[i] = state.columnModuleBoundaries[i];
          }
          if (state.columnTopModuleShelves[i]) {
            newColumnTopModuleShelves[i] = state.columnTopModuleShelves[i];
          }
        }
      } else if (newColumnCount > oldColumnCount) {
        // Columns increased - initialize module boundaries for new columns if height > 200cm
        const heightM = state.height / 100;
        if (heightM > TARGET_BOTTOM_HEIGHT) {
          const initialBoundary = Math.min(
            MAX_MODULE_HEIGHT, // Bottom <= 200cm
            heightM - MIN_TOP_HEIGHT, // Top >= 10cm
          );
          newColumnModuleBoundaries = { ...state.columnModuleBoundaries };
          newColumnTopModuleShelves = { ...state.columnTopModuleShelves };
          for (let i = oldColumnCount; i < newColumnCount; i++) {
            newColumnModuleBoundaries[i] = initialBoundary;
            newColumnTopModuleShelves[i] = [];
          }
        }
      }

      const widthUpdates = {
        width: newWidth,
        verticalBoundaries: newBoundaries,
        columnHorizontalBoundaries: newColumnHorizontalBoundaries,
        columnHeights: newColumnHeights,
        columnModuleBoundaries: newColumnModuleBoundaries,
        columnTopModuleShelves: newColumnTopModuleShelves,
      };
      const reconciled = reconcileWardrobeState({
        ...state,
        ...widthUpdates,
      } as any);
      return { ...widthUpdates, ...(reconciled as any) };
    }),
  setHeight: (newHeight) =>
    set((state) => {
      const oldHeightM = state.height / 100;
      const newHeightM = newHeight / 100;

      // Scale shelves proportionally when height changes (restore old behavior)
      // Filtering will happen AFTER module boundaries are determined to remove invalid ones
      const newColumnBoundaries: Record<number, number[]> = {};
      Object.keys(state.columnHorizontalBoundaries).forEach((key) => {
        const colIdx = Number(key);
        const oldShelves = state.columnHorizontalBoundaries[colIdx] || [];
        if (oldShelves.length > 0 && oldHeightM > 0) {
          const scaledShelves = oldShelves.map((y) => {
            const ratio = y / oldHeightM;
            return ratio * newHeightM;
          });
          newColumnBoundaries[colIdx] = scaledShelves;
        } else {
          newColumnBoundaries[colIdx] = oldShelves;
        }
      });

      // Handle module boundaries: scale or remove based on new height
      let newModuleBoundaries: Record<number, number | null> = {};
      let newTopModuleShelves: Record<number, number[]> = {};

      if (newHeightM > TARGET_BOTTOM_HEIGHT) {
        // Preserve existing module boundaries - DON'T scale, just clamp to valid range
        // This prevents boundary drift when height drops and rises again
        Object.keys(state.columnModuleBoundaries).forEach((key) => {
          const colIdx = Number(key);
          const oldBoundary = state.columnModuleBoundaries[colIdx];
          if (oldBoundary === null || oldBoundary === undefined) return;

          // Clamp boundary to valid range (don't scale)
          const minY = Math.max(
            MIN_TOP_HEIGHT, // Bottom >= 10cm
            newHeightM - MAX_MODULE_HEIGHT, // Top <= 200cm
          );
          const maxY = Math.min(
            newHeightM - MIN_TOP_HEIGHT, // Top >= 10cm
            MAX_MODULE_HEIGHT, // Bottom <= 200cm
          );
          const clampedBoundary = Math.max(minY, Math.min(maxY, oldBoundary));
          newModuleBoundaries[colIdx] = clampedBoundary;

          // Top module shelves: clamp count and redistribute evenly
          const topShelves = state.columnTopModuleShelves[colIdx] || [];
          if (topShelves.length > 0 && clampedBoundary === oldBoundary) {
            const topModuleH = newHeightM - clampedBoundary;
            const topModuleHCm = topModuleH * 100;
            const maxShelves = getMaxShelvesForHeight(topModuleHCm);
            const clampedCount = Math.min(topShelves.length, maxShelves);

            if (clampedCount > 0) {
              const panelT = 0.018;
              const usableH = topModuleH - 2 * panelT;
              const gap = usableH / (clampedCount + 1);
              const positions: number[] = [];
              for (let i = 1; i <= clampedCount; i++) {
                positions.push(clampedBoundary + panelT + i * gap);
              }
              newTopModuleShelves[colIdx] = positions;
            } else {
              newTopModuleShelves[colIdx] = [];
            }
          } else {
            // Boundary was clamped or no shelves, clear
            newTopModuleShelves[colIdx] = [];
          }
        });

        // Initialize boundaries for columns that don't have one yet
        const columnCount = state.verticalBoundaries.length + 1;
        for (let i = 0; i < columnCount; i++) {
          if (newModuleBoundaries[i] === undefined) {
            newModuleBoundaries[i] = Math.min(
              MAX_MODULE_HEIGHT, // Bottom <= 200cm
              newHeightM - MIN_TOP_HEIGHT, // Top >= 10cm
            );
            newTopModuleShelves[i] = [];
          }
        }
      } else {
        // Height below threshold - PRESERVE boundaries EXACTLY for later restoration
        // Rendering checks colH <= splitThreshold, so top module won't be shown
        // IMPORTANT: Do NOT clamp the boundary! Just keep it as-is so when height
        // goes back above threshold, the boundary returns to its original position.
        Object.keys(state.columnModuleBoundaries).forEach((key) => {
          const colIdx = Number(key);
          const oldBoundary = state.columnModuleBoundaries[colIdx];
          if (oldBoundary === null || oldBoundary === undefined) return;

          // Keep existing boundary exactly as-is
          newModuleBoundaries[colIdx] = oldBoundary;
          newTopModuleShelves[colIdx] = []; // Clear top shelves (not visible anyway)
        });
      }

      // Filter scaled shelves to valid range AND enforce minimum 10cm gaps
      // This ensures shelves that scaled above the boundary OR are too close together are filtered out
      const panelT = 0.018; // 18mm panel thickness
      const minGap = MIN_DRAG_GAP; // 10cm minimum gap between shelves
      Object.keys(newColumnBoundaries).forEach((key) => {
        const colIdx = Number(key);
        const scaledShelves = newColumnBoundaries[colIdx] || [];
        if (scaledShelves.length === 0) return;

        const moduleBoundary = newModuleBoundaries[colIdx];
        const effectiveCeiling =
          moduleBoundary !== undefined &&
          moduleBoundary !== null &&
          newHeightM > TARGET_BOTTOM_HEIGHT
            ? moduleBoundary
            : newHeightM;
        // Min/max shelf positions accounting for shelf thickness (t/2 from center to surface)
        const minShelfY = panelT + minGap + panelT / 2;
        const maxShelfY = effectiveCeiling - panelT - minGap - panelT / 2;

        // First filter by bounds
        const boundsFiltered = scaledShelves
          .filter((y) => y > minShelfY && y < maxShelfY)
          .sort((a, b) => a - b);

        // Then filter to maintain minimum 10cm CLEAR gap between adjacent shelf surfaces
        const gapFiltered: number[] = [];
        let lastY = panelT; // Start from bottom panel top surface
        let lastIsShelf = false;
        for (const y of boundsFiltered) {
          const clearBelow = lastIsShelf
            ? y - lastY - panelT
            : y - lastY - panelT / 2;
          const clearAbove = effectiveCeiling - panelT - y - panelT / 2;
          if (clearBelow >= minGap && clearAbove >= minGap) {
            gapFiltered.push(y);
            lastY = y;
            lastIsShelf = true;
          }
        }

        newColumnBoundaries[colIdx] = gapFiltered;
      });

      // Validate inner shelf configs for both bottom AND top modules
      const panelTVal = DEFAULT_PANEL_THICKNESS_M;
      let newElementConfigs = state.elementConfigs;

      Object.keys(newColumnBoundaries).forEach((key) => {
        const colIdx = Number(key);
        const colLetter = String.fromCharCode(65 + colIdx);
        const shelves = newColumnBoundaries[colIdx] || [];
        const moduleBoundary = newModuleBoundaries[colIdx];
        const hasModule =
          moduleBoundary !== undefined &&
          moduleBoundary !== null &&
          newHeightM > TARGET_BOTTOM_HEIGHT;

        // Bottom module compartments
        const bottomCeiling = hasModule
          ? moduleBoundary - panelTVal
          : newHeightM - panelTVal;
        const bottomBounds = [panelTVal, ...shelves, bottomCeiling];
        newElementConfigs = validateInnerShelfConfigs(
          newElementConfigs,
          colLetter,
          0,
          bottomBounds,
        );

        // Top module compartments (if module boundary exists)
        if (hasModule) {
          const topShelves = newTopModuleShelves[colIdx] || [];
          const topBounds = [
            moduleBoundary + panelTVal,
            ...topShelves,
            newHeightM - panelTVal,
          ];
          const bottomCompCount = shelves.length + 1;
          newElementConfigs = validateInnerShelfConfigs(
            newElementConfigs,
            colLetter,
            bottomCompCount,
            topBounds,
          );
        }
      });

      const heightUpdates = {
        height: newHeight,
        columnHeights: {}, // Reset ALL manual column heights (intentional)
        columnHorizontalBoundaries: newColumnBoundaries,
        columnModuleBoundaries: newModuleBoundaries,
        columnTopModuleShelves: newTopModuleShelves,
        elementConfigs: newElementConfigs,
      };
      const reconciled = reconcileWardrobeState({
        ...state,
        ...heightUpdates,
      } as any);
      return { ...heightUpdates, ...(reconciled as any) };
    }),
  setDepth: (depth) => set({ depth }),
  setPanelThickness: (panelThickness) => set({ panelThickness }),
  setNumberOfColumns: (numberOfColumns) =>
    set((state) => {
      let columnWidths = [...state.columnWidths];
      let rowCounts = [...state.rowCounts];
      if (numberOfColumns > columnWidths.length) {
        columnWidths = [
          ...columnWidths,
          ...Array(numberOfColumns - columnWidths.length).fill(1),
        ];
        rowCounts = [
          ...rowCounts,
          ...Array(numberOfColumns - rowCounts.length).fill(0), // Default to 0
        ];
      } else if (numberOfColumns < columnWidths.length) {
        columnWidths = columnWidths.slice(0, numberOfColumns);
        rowCounts = rowCounts.slice(0, numberOfColumns);
      }
      return { numberOfColumns, columnWidths, rowCounts };
    }),
  setColumnWidth: (index, width) =>
    set((state) => {
      const columnWidths = [...state.columnWidths];
      columnWidths[index] = width;
      return { columnWidths };
    }),
  setViewMode: (viewMode) => set({ viewMode }),
  setRowCount: (index, count) =>
    set((state) => {
      const rowCounts = [...state.rowCounts];
      rowCounts[index] = count;
      return { rowCounts };
    }),
  setSelectedMaterial: (material) => set({ selectedMaterial: material }),
  setSelectedMaterialId: (id) => set({ selectedMaterialId: id }),
  setSelectedFrontMaterialId: (id) => set({ selectedFrontMaterialId: id }),
  setSelectedBackMaterialId: (id) => set({ selectedBackMaterialId: id }),
  setShowDimensions: (show) => set({ showDimensions: show }),
  showEdgesOnly: false,
  setShowEdgesOnly: (show) => set({ showEdgesOnly: show }),
  // Fit trigger
  fitRequestId: 0,
  triggerFitToView: () =>
    set((state) => ({ fitRequestId: state.fitRequestId + 1 })),
  // Force front view trigger (for Ivice download)
  forceFrontViewId: 0,
  triggerForceFrontView: () =>
    set((state) => ({ forceFrontViewId: state.forceFrontViewId + 1 })),
  // Per-element configuration defaults
  selectedElementKey: null,
  setSelectedElementKey: (key) => set({ selectedElementKey: key }),
  elementConfigs: {},
  setElementColumns: (key, columns) =>
    set((state) => {
      const current = state.elementConfigs[key] ?? {
        columns: 1,
        rowCounts: [0],
        drawerCounts: [0],
      };
      // Adjust rowCounts length to match new columns
      let rowCounts = [...current.rowCounts];
      if (columns > rowCounts.length) {
        rowCounts = [
          ...rowCounts,
          ...Array(columns - rowCounts.length).fill(0),
        ];
      } else if (columns < rowCounts.length) {
        rowCounts = rowCounts.slice(0, columns);
      }
      // Adjust drawerCounts length to match new columns
      let drawerCounts = [...(current.drawerCounts ?? [])];
      if (columns > drawerCounts.length) {
        drawerCounts = [
          ...drawerCounts,
          ...Array(columns - drawerCounts.length).fill(0),
        ];
      } else if (columns < drawerCounts.length) {
        drawerCounts = drawerCounts.slice(0, columns);
      }
      // Clear "whole compartment drawer" when adding subdivisions
      if (columns > 1 && drawerCounts[0] > 0) {
        drawerCounts[0] = 0;
      }
      // Clear rod/LED if compartment now has subdivisions
      const hasSubdivisions =
        columns > 1 ||
        rowCounts.some((c) => c > 0) ||
        drawerCounts.some((c) => c > 0);
      let compartmentExtras = state.compartmentExtras;
      if (hasSubdivisions && state.compartmentExtras[key]) {
        const { rod, led, ...rest } = state.compartmentExtras[key];
        compartmentExtras = {
          ...state.compartmentExtras,
          [key]: rest,
        };
      }
      return {
        elementConfigs: {
          ...state.elementConfigs,
          [key]: { columns, rowCounts, drawerCounts },
        },
        compartmentExtras,
      };
    }),
  setElementRowCount: (key, index, count) =>
    set((state) => {
      const current = state.elementConfigs[key] ?? {
        columns: 1,
        rowCounts: [0],
      };

      // Clamp count based on compartment height
      const compHeightCm = getCompartmentHeightCm(key, state);
      const maxShelves = isNaN(compHeightCm)
        ? 0
        : Math.max(0, Math.floor(compHeightCm / MIN_SHELF_HEIGHT_CM) - 1);
      const clampedCount = Math.min(count, maxShelves);

      const rowCounts = [...current.rowCounts];
      // Ensure index exists
      if (index >= rowCounts.length) {
        rowCounts.length = index + 1;
        for (let i = 0; i < rowCounts.length; i++)
          if (rowCounts[i] == null) rowCounts[i] = 0;
      }
      rowCounts[index] = clampedCount;
      // Clear "whole compartment drawer" when adding shelves
      let updatedConfig = { ...current, rowCounts };
      if (
        clampedCount > 0 &&
        (current.drawerCounts?.[0] ?? 0) > 0 &&
        (current.columns ?? 1) === 1
      ) {
        const drawerCounts = [...(current.drawerCounts ?? [])];
        drawerCounts[0] = 0;
        updatedConfig = { ...updatedConfig, drawerCounts };
      }
      // Clear rod/LED if compartment now has subdivisions
      const hasSubdivisions =
        (current.columns ?? 1) > 1 ||
        rowCounts.some((c) => c > 0) ||
        (updatedConfig.drawerCounts?.some((c) => c > 0) ?? false);
      let compartmentExtras = state.compartmentExtras;
      if (hasSubdivisions && state.compartmentExtras[key]) {
        const { rod, led, ...rest } = state.compartmentExtras[key];
        compartmentExtras = {
          ...state.compartmentExtras,
          [key]: rest,
        };
      }
      return {
        elementConfigs: {
          ...state.elementConfigs,
          [key]: updatedConfig,
        },
        compartmentExtras,
      };
    }),
  setElementDrawerCount: (key, index, count) =>
    set((state) => {
      const current = state.elementConfigs[key] ?? {
        columns: 1,
        rowCounts: [0],
        drawerCounts: [0],
      };
      const drawerCounts = [...(current.drawerCounts ?? [])];
      // Ensure index exists
      if (index >= drawerCounts.length) {
        drawerCounts.length = index + 1;
        for (let i = 0; i < drawerCounts.length; i++)
          if (drawerCounts[i] == null) drawerCounts[i] = 0;
      }
      drawerCounts[index] = count;
      // Clear rod/LED if compartment now has subdivisions
      const hasSubdivisions =
        (current.columns ?? 1) > 1 ||
        (current.rowCounts?.some((c) => c > 0) ?? false) ||
        drawerCounts.some((c) => c > 0);
      let compartmentExtras = state.compartmentExtras;
      if (hasSubdivisions && state.compartmentExtras[key]) {
        const { rod, led, ...rest } = state.compartmentExtras[key];
        compartmentExtras = {
          ...state.compartmentExtras,
          [key]: rest,
        };
      }
      return {
        elementConfigs: {
          ...state.elementConfigs,
          [key]: { ...current, drawerCounts },
        },
        compartmentExtras,
      };
    }),
  setElementDrawerExternal: (key, index, isExternal) =>
    set((state) => {
      const current = state.elementConfigs[key] ?? {
        columns: 1,
        rowCounts: [0],
        drawerCounts: [0],
        drawersExternal: [true],
      };
      const drawersExternal = [...(current.drawersExternal ?? [])];
      // Ensure index exists
      if (index >= drawersExternal.length) {
        drawersExternal.length = index + 1;
        for (let i = 0; i < drawersExternal.length; i++)
          if (drawersExternal[i] == null) drawersExternal[i] = true; // Default to external
      }
      drawersExternal[index] = isExternal;
      return {
        elementConfigs: {
          ...state.elementConfigs,
          [key]: { ...current, drawersExternal },
        },
      };
    }),
  // Base defaults
  hasBase: false,
  baseHeight: 3,
  setHasBase: (val) => set({ hasBase: val }),
  setBaseHeight: (val) =>
    set({ baseHeight: Math.max(3, isNaN(val) ? 3 : val) }),
  // Extras defaults
  extrasMode: false,
  setExtrasMode: (val) => set({ extrasMode: val }),
  selectedCompartmentKey: null,
  setSelectedCompartmentKey: (key) => set({ selectedCompartmentKey: key }),
  hoveredCompartmentKey: null,
  setHoveredCompartmentKey: (key) => set({ hoveredCompartmentKey: key }),
  compartmentExtras: {},
  toggleCompVerticalDivider: (key) =>
    set((state) => {
      const prev = state.compartmentExtras[key] ?? {};
      return {
        compartmentExtras: {
          ...state.compartmentExtras,
          [key]: { ...prev, verticalDivider: !prev.verticalDivider },
        },
      };
    }),
  toggleCompDrawers: (key) =>
    set((state) => {
      const prev = state.compartmentExtras[key] ?? {};
      return {
        compartmentExtras: {
          ...state.compartmentExtras,
          [key]: { ...prev, drawers: !prev.drawers },
        },
      };
    }),
  setCompDrawersCount: (key, count) =>
    set((state) => {
      const prev = state.compartmentExtras[key] ?? {};
      return {
        compartmentExtras: {
          ...state.compartmentExtras,
          [key]: { ...prev, drawersCount: Math.max(0, Math.floor(count)) },
        },
      };
    }),
  toggleCompRod: (key) =>
    set((state) => {
      const prev = state.compartmentExtras[key] ?? {};
      return {
        compartmentExtras: {
          ...state.compartmentExtras,
          [key]: { ...prev, rod: !prev.rod },
        },
      };
    }),
  toggleCompLed: (key) =>
    set((state) => {
      const prev = state.compartmentExtras[key] ?? {};
      return {
        compartmentExtras: {
          ...state.compartmentExtras,
          [key]: { ...prev, led: !prev.led },
        },
      };
    }),
  // Doors defaults
  selectedDoorElementKey: null,
  setSelectedDoorElementKey: (key) => set({ selectedDoorElementKey: key }),
  doorSelections: {},
  setDoorOption: (key, option) =>
    set((state) => ({
      doorSelections: { ...state.doorSelections, [key]: option },
    })),
  showDoors: true,
  setShowDoors: (show) => set({ showDoors: show }),
  // Door multi-select drag state (Step 5)
  doorSelectionDragging: false,
  doorSelectionStart: null,
  doorSelectionCurrent: null,
  selectedDoorCompartments: [],
  // Door groups (span multiple compartments)
  doorGroups: [],
  // Per-door material and handle settings
  globalHandleId: "handle_1", // Default handle for all doors
  globalHandleFinish: "chrome", // Default handle finish for all doors
  doorSettingsMode: "global", // Default to global mode
  setDoorMaterial: (groupId: string, materialId: number) =>
    set((state) => ({
      doorGroups: state.doorGroups.map((g: DoorGroup) =>
        g.id === groupId ? { ...g, materialId } : g,
      ),
    })),
  setDoorHandle: (groupId: string, handleId: string) =>
    set((state) => ({
      doorGroups: state.doorGroups.map((g: DoorGroup) =>
        g.id === groupId ? { ...g, handleId } : g,
      ),
    })),
  setDoorHandleFinish: (groupId: string, finish: string) =>
    set((state) => ({
      doorGroups: state.doorGroups.map((g: DoorGroup) =>
        g.id === groupId ? { ...g, handleFinish: finish } : g,
      ),
    })),
  setGlobalHandle: (handleId: string) => set({ globalHandleId: handleId }),
  setGlobalHandleFinish: (finish: string) =>
    set({ globalHandleFinish: finish }),
  setDoorSettingsMode: (mode: DoorSettingsMode) =>
    set((state) => {
      if (mode === "global") {
        // When switching to global mode, clear per-door settings
        return {
          doorSettingsMode: mode,
          doorGroups: state.doorGroups.map((g: DoorGroup) => {
            // eslint-disable-next-line @typescript-eslint/no-unused-vars
            const { materialId, handleId, handleFinish, ...rest } = g;
            return rest as DoorGroup;
          }),
        };
      }
      // When switching to per-door mode, initialize all existing doors with
      // copies of the current global settings so each can be customized independently
      return {
        doorSettingsMode: mode,
        doorGroups: state.doorGroups.map((g: DoorGroup) => ({
          ...g,
          materialId: state.selectedFrontMaterialId,
          handleId: state.globalHandleId,
          handleFinish: state.globalHandleFinish,
        })),
      };
    }),
  getDoorGroupForCompartment: (compKey: string): DoorGroup | null => {
    const state = useShelfStore.getState();
    return (
      state.doorGroups.find((g: DoorGroup) =>
        g.compartments.includes(compKey),
      ) ?? null
    );
  },
  removeDoorGroup: (groupId: string) =>
    set((state) => {
      const group = state.doorGroups.find((g: DoorGroup) => g.id === groupId);
      if (!group) return state;

      // Also remove from doorSelections for backward compatibility
      const newSelections = { ...state.doorSelections };
      for (const compKey of group.compartments) {
        delete newSelections[compKey];
      }

      return {
        doorGroups: state.doorGroups.filter((g: DoorGroup) => g.id !== groupId),
        doorSelections: newSelections,
        // Clear selection
        selectedDoorCompartments: [],
      };
    }),
  startDoorSelection: (compKey: string) =>
    set((state) => {
      // Check if compartment is part of existing group
      const existingGroup = state.doorGroups.find((g: DoorGroup) =>
        g.compartments.includes(compKey),
      );

      if (existingGroup) {
        // Re-select existing group (no dragging, just selection)
        return {
          doorSelectionDragging: false,
          isDragging: false, // Not dragging, just selecting existing group
          doorSelectionStart: null,
          doorSelectionCurrent: null,
          selectedDoorCompartments: [...existingGroup.compartments],
        };
      }

      // Start new selection (dragging)
      return {
        doorSelectionDragging: true,
        isDragging: true, // Disable OrbitControls during drag
        doorSelectionStart: compKey,
        doorSelectionCurrent: compKey,
        selectedDoorCompartments: [compKey],
      };
    }),
  updateDoorSelectionDrag: (compKey: string) =>
    set((state) => {
      if (!state.doorSelectionDragging || !state.doorSelectionStart)
        return state;

      // Parse both keys using the new parseSubCompKey utility
      const startParsed = parseSubCompKey(state.doorSelectionStart);
      const currentParsed = parseSubCompKey(compKey);

      if (!startParsed || !currentParsed) return state;

      // Must be in the same column
      if (startParsed.column !== currentParsed.column) return state;

      let selected: string[] = [];

      // Case 1: Both are sub-compartments in SAME base compartment AND SAME section
      // This restricts selection to within one shelf-divided section (vertical stacking only)
      if (
        startParsed.isSubComp &&
        currentParsed.isSubComp &&
        startParsed.compKey === currentParsed.compKey &&
        startParsed.sectionIdx === currentParsed.sectionIdx
      ) {
        // Generate range of sub-compartment keys within same section
        const minSpace = Math.min(startParsed.spaceIdx, currentParsed.spaceIdx);
        const maxSpace = Math.max(startParsed.spaceIdx, currentParsed.spaceIdx);
        for (let i = minSpace; i <= maxSpace; i++) {
          selected.push(
            `${startParsed.compKey}.${startParsed.sectionIdx}.${i}`,
          );
        }
      }
      // Case 2: Cross-compartment selection (different compIdx, or mixed types)
      // Include all compartments in the index range, expanding subdivided ones to their sub-keys
      // STOP at external drawers (can't span doors over them)
      else {
        const column = startParsed.column;
        const startIdx = startParsed.compIdx;
        const endIdx = currentParsed.compIdx;
        const goingUp = endIdx > startIdx;

        // Helper to check if a compartment has external drawers
        const hasExternalDrawers = (compIdx: number): boolean => {
          const baseKey = `${column}${compIdx}`;
          const cfg = state.elementConfigs[baseKey];
          if (!cfg) return false;
          const hasDrawers =
            cfg.drawerCounts?.some((c: number) => c > 0) ?? false;
          const isExternal =
            cfg.drawersExternal?.some((e) => e !== false) ?? true;
          return hasDrawers && isExternal;
        };

        // Helper to add compartment (handles subdivided compartments)
        const addCompartment = (compIdx: number) => {
          const baseKey = `${column}${compIdx}`;
          const cfg = state.elementConfigs[baseKey];

          // Check if this compartment has ONLY horizontal shelves (needs sub-keys)
          const hasOnlyHorizontalShelves =
            cfg &&
            (cfg.columns ?? 1) === 1 &&
            (cfg.rowCounts?.some((c: number) => c > 0) ?? false);

          if (hasOnlyHorizontalShelves) {
            // Include all sub-compartments for this base key
            const shelfCount = cfg.rowCounts?.[0] ?? 0;
            const numSpaces = shelfCount + 1;
            for (let spaceIdx = 0; spaceIdx < numSpaces; spaceIdx++) {
              selected.push(`${baseKey}.0.${spaceIdx}`);
            }
          } else {
            // Simple compartment (no subdivisions, or BOTH types → treated as single)
            selected.push(baseKey);
          }
        };

        // Iterate FROM start TOWARD end, stopping at external drawers
        if (goingUp) {
          for (let compIdx = startIdx; compIdx <= endIdx; compIdx++) {
            // Stop if we hit an external drawer (but include start even if blocked - shouldn't happen)
            if (compIdx !== startIdx && hasExternalDrawers(compIdx)) break;
            addCompartment(compIdx);
          }
        } else {
          for (let compIdx = startIdx; compIdx >= endIdx; compIdx--) {
            // Stop if we hit an external drawer
            if (compIdx !== startIdx && hasExternalDrawers(compIdx)) break;
            addCompartment(compIdx);
          }
        }
      }

      // Auto-expand: if any selected compartment is part of an existing group,
      // include ALL compartments from that group
      const expandedSet = new Set(selected);
      for (const group of state.doorGroups) {
        const hasOverlap = group.compartments.some((c) => expandedSet.has(c));
        if (hasOverlap) {
          // Add all compartments from this group
          group.compartments.forEach((c) => expandedSet.add(c));
        }
      }

      // Convert back to sorted array
      selected = Array.from(expandedSet).sort((a, b) => {
        const aParsed = parseSubCompKey(a);
        const bParsed = parseSubCompKey(b);
        if (!aParsed || !bParsed) return 0;

        // Sort by column first
        if (aParsed.column !== bParsed.column)
          return aParsed.column.localeCompare(bParsed.column);
        // Then by compartment index
        if (aParsed.compIdx !== bParsed.compIdx)
          return aParsed.compIdx - bParsed.compIdx;
        // Then by section index
        if (aParsed.sectionIdx !== bParsed.sectionIdx)
          return aParsed.sectionIdx - bParsed.sectionIdx;
        // Finally by space index
        return aParsed.spaceIdx - bParsed.spaceIdx;
      });

      return {
        doorSelectionCurrent: compKey,
        selectedDoorCompartments: selected,
      };
    }),
  endDoorSelection: () =>
    set((state) => ({
      doorSelectionDragging: false,
      isDragging: false, // Re-enable OrbitControls after drag ends
      // Keep selectedDoorCompartments for UI to show options
    })),
  clearDoorSelection: () =>
    set({
      doorSelectionDragging: false,
      isDragging: false, // Re-enable OrbitControls
      doorSelectionStart: null,
      doorSelectionCurrent: null,
      selectedDoorCompartments: [],
    }),
  setDoorForSelection: (type) =>
    set((state) => {
      if (state.selectedDoorCompartments.length === 0) return state;

      // Sort using parseSubCompKey for proper handling of sub-compartment keys
      const selectedComps = [...state.selectedDoorCompartments].sort((a, b) => {
        const aParsed = parseSubCompKey(a);
        const bParsed = parseSubCompKey(b);
        if (!aParsed || !bParsed) return 0;

        // Sort by column first
        if (aParsed.column !== bParsed.column)
          return aParsed.column.localeCompare(bParsed.column);
        // Then by compartment index
        if (aParsed.compIdx !== bParsed.compIdx)
          return aParsed.compIdx - bParsed.compIdx;
        // Then by section index
        if (aParsed.sectionIdx !== bParsed.sectionIdx)
          return aParsed.sectionIdx - bParsed.sectionIdx;
        // Finally by space index
        return aParsed.spaceIdx - bParsed.spaceIdx;
      });

      // Split selection into contiguous groups (handles gaps from external drawers)
      // A gap occurs when compartment indices are not consecutive
      const contiguousGroups: string[][] = [];
      let currentGroup: string[] = [];

      for (let i = 0; i < selectedComps.length; i++) {
        const comp = selectedComps[i];
        const parsed = parseSubCompKey(comp);

        if (i === 0) {
          currentGroup.push(comp);
          continue;
        }

        const prevComp = selectedComps[i - 1];
        const prevParsed = parseSubCompKey(prevComp);

        // Check if this compartment is contiguous with the previous one
        let isContiguous = false;
        if (parsed && prevParsed) {
          // Same column check
          if (parsed.column === prevParsed.column) {
            if (parsed.isSubComp && prevParsed.isSubComp) {
              // Both are sub-compartments - check if same compartment & section, consecutive space
              if (
                parsed.compKey === prevParsed.compKey &&
                parsed.sectionIdx === prevParsed.sectionIdx
              ) {
                isContiguous = parsed.spaceIdx === prevParsed.spaceIdx + 1;
              }
            } else if (!parsed.isSubComp && !prevParsed.isSubComp) {
              // Both are main compartments - check consecutive index
              isContiguous = parsed.compIdx === prevParsed.compIdx + 1;
            }
            // Mixed sub/main compartments are NOT contiguous (different structure)
          }
        }

        if (isContiguous) {
          currentGroup.push(comp);
        } else {
          // Start a new group
          if (currentGroup.length > 0) {
            contiguousGroups.push(currentGroup);
          }
          currentGroup = [comp];
        }
      }
      // Don't forget the last group
      if (currentGroup.length > 0) {
        contiguousGroups.push(currentGroup);
      }

      // Remove any existing groups that overlap with this selection
      const newGroups = state.doorGroups.filter((g: DoorGroup) => {
        const hasOverlap = g.compartments.some((c: string) =>
          selectedComps.includes(c),
        );
        return !hasOverlap;
      });

      // Handle "none" type - just remove the group, don't create a new one
      if (type === "none") {
        // Also remove from doorSelections for backward compatibility
        const newSelections = { ...state.doorSelections };
        for (const key of selectedComps) {
          delete newSelections[key];
        }

        return {
          doorGroups: newGroups,
          doorSelections: newSelections,
          // Clear selection after applying
          doorSelectionDragging: false,
          doorSelectionStart: null,
          doorSelectionCurrent: null,
          selectedDoorCompartments: [],
        };
      }

      // Create new door group(s)
      const createdGroups: DoorGroup[] = [];

      if (type === "drawerStyle") {
        // drawerStyle: one group per subcompartment (individual drawer fronts)
        for (const comp of selectedComps) {
          const parsed = parseSubCompKey(comp);
          const column = parsed?.column ?? "A";
          createdGroups.push({
            id: `door-${comp}`,
            type,
            compartments: [comp],
            column,
            ...(state.doorSettingsMode === "per-door" && {
              materialId: state.selectedFrontMaterialId,
              handleId: state.globalHandleId,
              handleFinish: state.globalHandleFinish,
            }),
          });
        }
      } else {
        // Other door types: one group per contiguous block
        for (const groupComps of contiguousGroups) {
          const firstParsed = parseSubCompKey(groupComps[0]);
          const column = firstParsed?.column ?? "A";
          const firstComp = groupComps[0];
          const lastComp = groupComps[groupComps.length - 1];
          const groupId =
            firstComp === lastComp
              ? `door-${firstComp}`
              : `door-${firstComp}-${lastComp}`;

          const newGroup: DoorGroup = {
            id: groupId,
            type,
            compartments: groupComps,
            column,
            ...(state.doorSettingsMode === "per-door" && {
              materialId: state.selectedFrontMaterialId,
              handleId: state.globalHandleId,
              handleFinish: state.globalHandleFinish,
            }),
          };
          createdGroups.push(newGroup);
        }
      }

      // Also update doorSelections for backward compatibility with cut list
      const newSelections = { ...state.doorSelections };
      for (const key of selectedComps) {
        newSelections[key] = type;
      }

      return {
        doorGroups: [...newGroups, ...createdGroups],
        doorSelections: newSelections,
        // Keep selection active so user can modify material/handle settings
        doorSelectionDragging: false,
        doorSelectionStart: null,
        doorSelectionCurrent: null,
        // Don't clear selectedDoorCompartments - keep panel open for further editing
      };
    }),
  showInfoButtons: false,
  setShowInfoButtons: (show) => set({ showInfoButtons: show }),
  // Track which accordion step is open (for Step 2 mode: hide labels, show circles)
  activeAccordionStep: "item-1", // Default to Step 1 open
  setActiveAccordionStep: (step) => {
    const stepNames: Record<string, string> = {
      "item-1": "Dimenzije",
      "item-2": "Kolone",
      "item-3": "Materijali",
      "item-4": "Baza",
      "item-5": "Vrata",
    };
    if (step && stepNames[step]) {
      posthog.capture("step_viewed", {
        step: parseInt(step.split("-")[1]),
        step_name: stepNames[step],
      });
    }
    set((state) => ({
      activeAccordionStep: step,
      // Clear compartment selection when step changes
      selectedCompartmentKey:
        step !== state.activeAccordionStep
          ? null
          : state.selectedCompartmentKey,
      // Clear door selection when step changes
      doorSelectionDragging: false,
      doorSelectionStart: null,
      doorSelectionCurrent: null,
      selectedDoorCompartments:
        step !== state.activeAccordionStep
          ? []
          : state.selectedDoorCompartments,
    }));
  },
  // Track loaded wardrobe for update functionality
  loadedWardrobeId: null,
  loadedWardrobeIsModel: false,
  setLoadedWardrobe: (id, isModel) =>
    set({ loadedWardrobeId: id, loadedWardrobeIsModel: isModel }),
  clearLoadedWardrobe: () =>
    set({ loadedWardrobeId: null, loadedWardrobeIsModel: false }),
  // Track order context when editing from order detail page
  fromOrderId: null,
  fromOrderNumber: null,
  setFromOrder: (orderId, orderNumber) =>
    set({ fromOrderId: orderId, fromOrderNumber: orderNumber }),
  clearFromOrder: () => set({ fromOrderId: null, fromOrderNumber: null }),
  // Track wardrobe context when editing from wardrobe preview page
  fromWardrobeId: null,
  fromWardrobeName: null,
  setFromWardrobe: (wardrobeId, wardrobeName) =>
    set({ fromWardrobeId: wardrobeId, fromWardrobeName: wardrobeName }),
  clearFromWardrobe: () =>
    set({ fromWardrobeId: null, fromWardrobeName: null }),
  // Track last saved snapshot for unsaved changes detection
  lastSavedSnapshot: null,
  setLastSavedSnapshot: (snapshot) => set({ lastSavedSnapshot: snapshot }),
  // Save operation state for UI feedback
  isSaving: false,
  setIsSaving: (val) => set({ isSaving: val }),
  lastSaveTime: null,
  setLastSaveTime: (time) => set({ lastSaveTime: time }),
  // Vertical structural boundaries (seam X positions in meters from center)
  // Initialize based on default width (210cm → 3 columns)
  // These seams span FULL HEIGHT of the wardrobe
  verticalBoundaries: getDefaultBoundariesX(210 / 100),
  setVerticalBoundary: (index, x) =>
    set((state) => {
      const boundaries = [...state.verticalBoundaries];
      boundaries[index] = x;
      const seamUpdate = { verticalBoundaries: boundaries };
      const reconciled = reconcileWardrobeState({
        ...state,
        ...seamUpdate,
      } as any);
      return { ...seamUpdate, ...(reconciled as any) };
    }),
  setVerticalBoundaries: (boundaries) =>
    set({ verticalBoundaries: boundaries }),
  resetVerticalBoundaries: () => set({ verticalBoundaries: [] }),
  // Per-column horizontal boundaries (array of Y positions, sorted bottom to top)
  columnHorizontalBoundaries: {},
  setColumnHorizontalBoundaries: (colIndex, boundaries) =>
    set((state) => ({
      columnHorizontalBoundaries: {
        ...state.columnHorizontalBoundaries,
        [colIndex]: [...boundaries].sort((a, b) => a - b), // ensure sorted
      },
    })),
  addColumnShelf: (colIndex, y) =>
    set((state) => {
      const existing = state.columnHorizontalBoundaries[colIndex] || [];
      if (existing.length >= MAX_SHELVES_PER_COLUMN) return state;
      const newBoundaries = [...existing, y].sort((a, b) => a - b);
      return {
        columnHorizontalBoundaries: {
          ...state.columnHorizontalBoundaries,
          [colIndex]: newBoundaries,
        },
      };
    }),
  removeColumnShelf: (colIndex, shelfIndex) =>
    set((state) => {
      const existing = state.columnHorizontalBoundaries[colIndex] || [];
      const newBoundaries = existing.filter((_, i) => i !== shelfIndex);
      return {
        columnHorizontalBoundaries: {
          ...state.columnHorizontalBoundaries,
          [colIndex]: newBoundaries,
        },
      };
    }),
  moveColumnShelf: (colIndex, shelfIndex, newY) =>
    set((state) => {
      const existing = state.columnHorizontalBoundaries[colIndex] || [];
      const newBoundaries = [...existing];
      newBoundaries[shelfIndex] = newY;
      // Re-sort to maintain order (in case shelf moved past another)
      newBoundaries.sort((a, b) => a - b);
      return {
        columnHorizontalBoundaries: {
          ...state.columnHorizontalBoundaries,
          [colIndex]: newBoundaries,
        },
      };
    }),
  setColumnShelfCount: (colIndex, count, panelThicknessM) =>
    set((state) => {
      const columnHeightCm = state.columnHeights[colIndex] ?? state.height;
      const columnHeightM = columnHeightCm / 100;

      // Check for module boundary - shelves go in bottom module only
      const moduleBoundary = state.columnModuleBoundaries[colIndex];
      const hasModuleBoundary =
        moduleBoundary !== null &&
        moduleBoundary !== undefined &&
        columnHeightM > TARGET_BOTTOM_HEIGHT;

      // Use bottom module height if module boundary exists, otherwise full column
      const effectiveHeightM = hasModuleBoundary
        ? moduleBoundary
        : columnHeightM;
      const effectiveHeightCm = effectiveHeightM * 100;

      // Clamp count to valid range based on effective (bottom module) height
      const maxShelves = getMaxShelvesForHeight(effectiveHeightCm);
      const clampedCount = Math.max(0, Math.min(count, maxShelves));

      // Calculate evenly-distributed positions within bottom module
      const newBoundaries = distributeShelvesEvenly(
        effectiveHeightM,
        clampedCount,
        panelThicknessM,
      );

      // Clear elementConfigs and compartmentExtras for this column when shelf count changes
      // This prevents invalid inner elements when compartment sizes change
      const oldBoundaries = state.columnHorizontalBoundaries[colIndex] || [];
      const colLetter = String.fromCharCode(65 + colIndex);
      let newElementConfigs = state.elementConfigs;
      let newCompartmentExtras = state.compartmentExtras;

      if (oldBoundaries.length !== clampedCount) {
        // Shelf count changed - clear all configs for this column
        newElementConfigs = { ...state.elementConfigs };
        newCompartmentExtras = { ...state.compartmentExtras };
        for (const key of Object.keys(newElementConfigs)) {
          if (key.startsWith(colLetter)) {
            delete newElementConfigs[key];
          }
        }
        for (const key of Object.keys(newCompartmentExtras)) {
          if (key.startsWith(colLetter)) {
            delete newCompartmentExtras[key];
          }
        }
      }

      return {
        columnHorizontalBoundaries: {
          ...state.columnHorizontalBoundaries,
          [colIndex]: newBoundaries,
        },
        elementConfigs: newElementConfigs,
        compartmentExtras: newCompartmentExtras,
      };
    }),
  resetColumnHorizontalBoundaries: () =>
    set({ columnHorizontalBoundaries: {} }),
  // Track if dragging is in progress (to disable OrbitControls)
  isDragging: false,
  setIsDragging: (val) => set({ isDragging: val }),
  // Per-column heights (in CM, default = global height)
  columnHeights: {},
  setColumnHeight: (colIdx, heightCm) =>
    set((state) => {
      const oldHeightCm = state.columnHeights[colIdx] ?? state.height;
      const oldHeightM = oldHeightCm / 100;
      const newHeightM = heightCm / 100;
      const oldBoundaries = state.columnHorizontalBoundaries[colIdx] || [];
      let newColumnBoundaries = state.columnHorizontalBoundaries;

      // Scale shelves proportionally when height changes (restore old behavior)
      // Filtering happens AFTER module boundary is determined to remove invalid ones
      if (oldBoundaries.length > 0 && oldHeightCm > 0) {
        const scaledBoundaries = oldBoundaries.map((y) => {
          const ratio = y / oldHeightM;
          return ratio * newHeightM;
        });
        newColumnBoundaries = {
          ...newColumnBoundaries,
          [colIdx]: scaledBoundaries,
        };
      }

      // Handle module boundary auto-initialization and scaling
      let newModuleBoundaries = state.columnModuleBoundaries;
      let newTopModuleShelves = state.columnTopModuleShelves;
      let newElementConfigs = state.elementConfigs;
      let newCompartmentExtras = state.compartmentExtras;
      const existingModuleBoundary = state.columnModuleBoundaries[colIdx];

      if (newHeightM > TARGET_BOTTOM_HEIGHT) {
        // Height exceeds threshold - need module boundary
        if (
          existingModuleBoundary === undefined ||
          existingModuleBoundary === null
        ) {
          // Auto-initialize: split at MAX_MODULE_HEIGHT (200cm if possible)
          const initialBoundary = Math.min(
            MAX_MODULE_HEIGHT, // Bottom <= 200cm
            newHeightM - MIN_TOP_HEIGHT, // Top >= 10cm
          );
          newModuleBoundaries = {
            ...newModuleBoundaries,
            [colIdx]: initialBoundary,
          };
        } else {
          // Existing boundary - DON'T scale, just clamp to valid range
          // This preserves absolute position when height changes
          // (Scaling caused position drift when height dropped and then increased again)
          const minY = Math.max(
            MIN_TOP_HEIGHT, // Bottom >= 10cm
            newHeightM - MAX_MODULE_HEIGHT, // Top <= 200cm
          );
          const maxY = Math.min(
            newHeightM - MIN_TOP_HEIGHT, // Top >= 10cm
            MAX_MODULE_HEIGHT, // Bottom <= 200cm
          );
          const clampedBoundary = Math.max(
            minY,
            Math.min(maxY, existingModuleBoundary),
          );
          newModuleBoundaries = {
            ...newModuleBoundaries,
            [colIdx]: clampedBoundary,
          };

          // Top module shelves: clamp count and redistribute evenly
          const topShelves = state.columnTopModuleShelves[colIdx] || [];
          if (
            topShelves.length > 0 &&
            clampedBoundary === existingModuleBoundary
          ) {
            const topModuleH = newHeightM - clampedBoundary;
            const topModuleHCm = topModuleH * 100;
            const maxShelves = getMaxShelvesForHeight(topModuleHCm);
            const clampedCount = Math.min(topShelves.length, maxShelves);

            if (clampedCount > 0) {
              const panelT = 0.018;
              const usableH = topModuleH - 2 * panelT;
              const gap = usableH / (clampedCount + 1);
              const positions: number[] = [];
              for (let i = 1; i <= clampedCount; i++) {
                positions.push(clampedBoundary + panelT + i * gap);
              }
              newTopModuleShelves = {
                ...newTopModuleShelves,
                [colIdx]: positions,
              };
            } else {
              newTopModuleShelves = {
                ...newTopModuleShelves,
                [colIdx]: [],
              };
            }
          } else {
            // Boundary was clamped, clear shelves
            newTopModuleShelves = {
              ...newTopModuleShelves,
              [colIdx]: [],
            };
          }
        }
      } else {
        // Height below threshold - PRESERVE module boundary EXACTLY (for restoration when height increases)
        // The rendering code checks colH <= splitThreshold, so the top module won't be shown
        // IMPORTANT: Do NOT clamp the boundary here! Clamping caused the bug where boundary
        // progressively shrank during drag, losing the original position.
        if (
          existingModuleBoundary !== undefined &&
          existingModuleBoundary !== null
        ) {
          // Keep existing boundary exactly as-is
          newModuleBoundaries = {
            ...newModuleBoundaries,
            [colIdx]: existingModuleBoundary,
          };
          // Clear top module shelves since there's no top module visible anymore
          newTopModuleShelves = {
            ...newTopModuleShelves,
            [colIdx]: [],
          };

          // Clear elementConfigs and compartmentExtras for TOP module compartments
          // These compartments no longer exist when height <= 200cm
          const colLetter = String.fromCharCode(65 + colIdx); // 0=A, 1=B, 2=C
          const bottomShelves = state.columnHorizontalBoundaries[colIdx] || [];
          const bottomCompartments = bottomShelves.length + 1;
          const topCompKey = `${colLetter}${bottomCompartments + 1}`;

          // Clear configs for the top module compartment
          if (state.elementConfigs[topCompKey]) {
            newElementConfigs = { ...newElementConfigs };
            delete newElementConfigs[topCompKey];
          }
          if (state.compartmentExtras[topCompKey]) {
            newCompartmentExtras = { ...newCompartmentExtras };
            delete newCompartmentExtras[topCompKey];
          }
        }
      }

      // Recalculate global height as actual max of all column heights
      // This ensures dimension lines and centering track the tallest column
      const updatedColumnHeights = {
        ...state.columnHeights,
        [colIdx]: heightCm,
      };
      const columnCount = state.verticalBoundaries.length + 1;
      let newGlobalHeight = 0;
      for (let i = 0; i < columnCount; i++) {
        const colH = updatedColumnHeights[i] ?? state.height;
        newGlobalHeight = Math.max(newGlobalHeight, colH);
      }

      // If global height increased past 200cm, initialize module boundaries for ALL columns
      // that don't have them yet (this handles the case where dragging one column
      // causes the global height to increase, affecting other columns)
      if (
        newGlobalHeight > state.height &&
        newGlobalHeight / 100 > TARGET_BOTTOM_HEIGHT
      ) {
        const columnCount = state.verticalBoundaries.length + 1;

        for (let i = 0; i < columnCount; i++) {
          // Skip the column being dragged (already handled above)
          if (i === colIdx) continue;

          // Check if this column needs a module boundary
          const colH = state.columnHeights[i] ?? newGlobalHeight;
          const colHM = colH / 100;

          if (colHM > TARGET_BOTTOM_HEIGHT) {
            // This column exceeds 200cm and doesn't have a boundary yet
            if (
              newModuleBoundaries[i] === undefined ||
              newModuleBoundaries[i] === null
            ) {
              const colInitialBoundary = Math.min(
                MAX_MODULE_HEIGHT,
                colHM - MIN_TOP_HEIGHT,
              );
              newModuleBoundaries = {
                ...newModuleBoundaries,
                [i]: colInitialBoundary,
              };
              // Initialize empty top module shelves
              newTopModuleShelves = {
                ...newTopModuleShelves,
                [i]: [],
              };
            }
          }
        }
      }

      // Filter scaled shelves to valid range AND enforce minimum 10cm gaps
      // This ensures shelves that scaled above the boundary OR are too close together are filtered out
      const scaledShelves = newColumnBoundaries[colIdx] || [];
      if (scaledShelves.length > 0) {
        const moduleBoundary = newModuleBoundaries[colIdx];
        const effectiveCeiling =
          moduleBoundary !== undefined &&
          moduleBoundary !== null &&
          newHeightM > TARGET_BOTTOM_HEIGHT
            ? moduleBoundary
            : newHeightM;
        const panelT = 0.018; // 18mm panel thickness
        const minGap = MIN_DRAG_GAP; // 10cm minimum gap between shelves
        // Min/max shelf positions accounting for shelf thickness (t/2 from center to surface)
        const minShelfY = panelT + minGap + panelT / 2;
        const maxShelfY = effectiveCeiling - panelT - minGap - panelT / 2;

        // First filter by bounds
        const boundsFiltered = scaledShelves
          .filter((y) => y > minShelfY && y < maxShelfY)
          .sort((a, b) => a - b);

        // Then filter to maintain minimum 10cm CLEAR gap between adjacent shelf surfaces
        const gapFiltered: number[] = [];
        let lastY = panelT; // Start from bottom panel top surface
        let lastIsShelf = false;
        for (const y of boundsFiltered) {
          const clearBelow = lastIsShelf
            ? y - lastY - panelT
            : y - lastY - panelT / 2;
          const clearAbove = effectiveCeiling - panelT - y - panelT / 2;
          if (clearBelow >= minGap && clearAbove >= minGap) {
            gapFiltered.push(y);
            lastY = y;
            lastIsShelf = true;
          }
        }

        newColumnBoundaries = {
          ...newColumnBoundaries,
          [colIdx]: gapFiltered,
        };
      }

      // Validate inner shelf configs for both bottom AND top modules
      const colLetter = String.fromCharCode(65 + colIdx);
      const shelves = newColumnBoundaries[colIdx] || [];
      const moduleBoundary = newModuleBoundaries[colIdx];
      const panelTVal = DEFAULT_PANEL_THICKNESS_M;
      const hasModule =
        moduleBoundary !== undefined &&
        moduleBoundary !== null &&
        newHeightM > TARGET_BOTTOM_HEIGHT;

      // Bottom module compartments
      const bottomCeiling = hasModule
        ? moduleBoundary - panelTVal
        : newHeightM - panelTVal;
      const bottomBounds = [panelTVal, ...shelves, bottomCeiling];
      newElementConfigs = validateInnerShelfConfigs(
        newElementConfigs,
        colLetter,
        0,
        bottomBounds,
      );

      // Top module compartments (if module boundary exists)
      if (hasModule) {
        const topShelves = newTopModuleShelves[colIdx] || [];
        const topBounds = [
          moduleBoundary + panelTVal,
          ...topShelves,
          newHeightM - panelTVal,
        ];
        const bottomCompCount = shelves.length + 1;
        newElementConfigs = validateInnerShelfConfigs(
          newElementConfigs,
          colLetter,
          bottomCompCount,
          topBounds,
        );
      }

      const colHeightUpdates = {
        height: newGlobalHeight,
        columnHeights: { ...state.columnHeights, [colIdx]: heightCm },
        columnHorizontalBoundaries: newColumnBoundaries,
        columnModuleBoundaries: newModuleBoundaries,
        columnTopModuleShelves: newTopModuleShelves,
        elementConfigs: newElementConfigs,
        compartmentExtras: newCompartmentExtras,
      };
      const reconciled = reconcileWardrobeState({
        ...state,
        ...colHeightUpdates,
      } as any);
      return { ...colHeightUpdates, ...(reconciled as any) };
    }),
  resetColumnHeights: () => set({ columnHeights: {} }),
  // Hovered column for bottom bar controls
  hoveredColumnIndex: null,
  setHoveredColumnIndex: (idx) => set({ hoveredColumnIndex: idx }),
  // Selected column for mobile tap-to-select
  selectedColumnIndex: null,
  setSelectedColumnIndex: (idx) => set({ selectedColumnIndex: idx }),
  // Per-column module boundaries (Y position where modules split, in meters)
  // Initialize for ALL columns based on default width (210cm → 3 columns) and height (240cm)
  // For 240cm height: boundary at ~180cm (bottom 180cm, top 60cm)
  columnModuleBoundaries: (() => {
    const defaultWidthM = 210 / 100; // 2.1m (matches default width: 210)
    const defaultHeightM = 240 / 100; // 2.4m (matches default height: 240)
    if (defaultHeightM <= TARGET_BOTTOM_HEIGHT) return {};

    const boundaries = getDefaultBoundariesX(defaultWidthM);
    const columnCount = boundaries.length + 1; // 3 columns for 210cm
    const initialBoundary = Math.min(
      MAX_MODULE_HEIGHT, // Bottom <= 200cm
      defaultHeightM - MIN_TOP_HEIGHT, // Top >= 10cm
    );

    const result: Record<number, number> = {};
    for (let i = 0; i < columnCount; i++) {
      result[i] = initialBoundary;
    }
    return result;
  })(),
  setColumnModuleBoundary: (colIdx, y) =>
    set((state) => ({
      columnModuleBoundaries: {
        ...state.columnModuleBoundaries,
        [colIdx]: y,
      },
    })),
  moveColumnModuleBoundary: (colIdx, newY) =>
    set((state) => {
      const colHeightCm = state.columnHeights[colIdx] ?? state.height;
      const colHeightM = colHeightCm / 100;

      // Get horizontal shelves for this column
      const shelves = state.columnHorizontalBoundaries[colIdx] || [];
      const highestShelfY = shelves.length > 0 ? Math.max(...shelves) : 0;

      // Panel thickness (from constants)
      const panelThicknessM = DEFAULT_PANEL_THICKNESS_M;

      // Min/max Y for module boundary
      // Constraints: NO module (top or bottom) can exceed 200cm
      // - minY ensures: bottom module >= 10cm AND top module <= 200cm
      // - maxY ensures: top module >= 10cm AND bottom module <= 200cm
      const minY = Math.max(
        MIN_TOP_HEIGHT, // Bottom >= 10cm
        colHeightM - MAX_MODULE_HEIGHT, // Top <= 200cm
        highestShelfY + panelThicknessM + 0.05,
      );
      const maxY = Math.min(
        colHeightM - MIN_TOP_HEIGHT, // Top >= 10cm
        MAX_MODULE_HEIGHT, // Bottom <= 200cm
      );

      // Clamp to valid range
      const clampedY = Math.max(minY, Math.min(maxY, newY));

      // Scale or clear top module shelves based on new boundary position
      const oldBoundary = state.columnModuleBoundaries[colIdx];
      const topShelves = state.columnTopModuleShelves[colIdx] || [];
      let newTopShelves = state.columnTopModuleShelves;

      if (
        topShelves.length > 0 &&
        oldBoundary !== null &&
        oldBoundary !== undefined
      ) {
        const oldTopModuleHeight = colHeightM - oldBoundary;
        const newTopModuleHeight = colHeightM - clampedY;

        // If new top module is too small (< 20cm usable), clear shelves
        if (newTopModuleHeight < 0.2) {
          newTopShelves = {
            ...state.columnTopModuleShelves,
            [colIdx]: [],
          };
        } else {
          // Clamp shelf count to what fits, redistribute evenly
          const topModuleHeightCm = newTopModuleHeight * 100;
          const maxShelves = getMaxShelvesForHeight(topModuleHeightCm);
          const clampedCount = Math.min(topShelves.length, maxShelves);

          if (clampedCount > 0) {
            const usableHeight = newTopModuleHeight - 2 * panelThicknessM;
            const gap = usableHeight / (clampedCount + 1);
            const positions: number[] = [];
            for (let i = 1; i <= clampedCount; i++) {
              positions.push(clampedY + panelThicknessM + i * gap);
            }
            newTopShelves = {
              ...state.columnTopModuleShelves,
              [colIdx]: positions,
            };
          } else {
            newTopShelves = { ...state.columnTopModuleShelves, [colIdx]: [] };
          }
        }
      }

      // Validate inner shelf configs for both bottom AND top modules
      const colLetter = String.fromCharCode(65 + colIdx);
      let newElementConfigs = state.elementConfigs;
      const shelvesList = state.columnHorizontalBoundaries[colIdx] || [];

      // Bottom module compartments
      const bottomBounds = [
        panelThicknessM,
        ...shelvesList,
        clampedY - panelThicknessM,
      ];
      newElementConfigs = validateInnerShelfConfigs(
        newElementConfigs,
        colLetter,
        0,
        bottomBounds,
      );

      // Top module compartments
      const topBounds = [
        clampedY + panelThicknessM,
        ...(newTopShelves[colIdx] || []),
        colHeightM - panelThicknessM,
      ];
      const bottomCompCount = shelvesList.length + 1;
      newElementConfigs = validateInnerShelfConfigs(
        newElementConfigs,
        colLetter,
        bottomCompCount,
        topBounds,
      );

      const moduleBoundaryUpdates = {
        columnModuleBoundaries: {
          ...state.columnModuleBoundaries,
          [colIdx]: clampedY,
        },
        columnTopModuleShelves: newTopShelves,
        elementConfigs: newElementConfigs,
      };
      const reconciled = reconcileWardrobeState({
        ...state,
        ...moduleBoundaryUpdates,
      } as any);
      return { ...moduleBoundaryUpdates, ...(reconciled as any) };
    }),
  // Per-column top module shelves (only valid when module boundary exists)
  columnTopModuleShelves: {},
  setColumnTopModuleShelfCount: (colIndex, count, panelThicknessM) =>
    set((state) => {
      const columnHeightCm = state.columnHeights[colIndex] ?? state.height;
      const columnHeightM = columnHeightCm / 100;
      const moduleBoundary = state.columnModuleBoundaries[colIndex];

      // No top module if no boundary
      if (moduleBoundary === null || moduleBoundary === undefined) {
        return state;
      }

      // Top module height = column height - module boundary
      const topModuleHeightM = columnHeightM - moduleBoundary;
      const topModuleHeightCm = topModuleHeightM * 100;

      // Clamp count to valid range based on top module height
      const maxShelves = getMaxShelvesForHeight(topModuleHeightCm);
      const clampedCount = Math.max(0, Math.min(count, maxShelves));

      // Distribute shelves within top module (Y positions are ABSOLUTE)
      const positions: number[] = [];
      if (clampedCount > 0) {
        const usableHeight = topModuleHeightM - 2 * panelThicknessM;
        const gap = usableHeight / (clampedCount + 1);
        for (let i = 1; i <= clampedCount; i++) {
          positions.push(moduleBoundary + panelThicknessM + i * gap);
        }
      }

      // Clear elementConfigs and compartmentExtras for this column when shelf count changes
      const oldShelves = state.columnTopModuleShelves[colIndex] || [];
      const colLetter = String.fromCharCode(65 + colIndex);
      let newElementConfigs = state.elementConfigs;
      let newCompartmentExtras = state.compartmentExtras;

      if (oldShelves.length !== clampedCount) {
        // Shelf count changed - clear all configs for this column
        newElementConfigs = { ...state.elementConfigs };
        newCompartmentExtras = { ...state.compartmentExtras };
        for (const key of Object.keys(newElementConfigs)) {
          if (key.startsWith(colLetter)) {
            delete newElementConfigs[key];
          }
        }
        for (const key of Object.keys(newCompartmentExtras)) {
          if (key.startsWith(colLetter)) {
            delete newCompartmentExtras[key];
          }
        }
      }

      return {
        columnTopModuleShelves: {
          ...state.columnTopModuleShelves,
          [colIndex]: positions,
        },
        elementConfigs: newElementConfigs,
        compartmentExtras: newCompartmentExtras,
      };
    }),
  moveTopModuleShelf: (colIndex, shelfIndex, newY) =>
    set((state) => {
      const shelves = [...(state.columnTopModuleShelves[colIndex] || [])];
      const moduleBoundary = state.columnModuleBoundaries[colIndex];
      const colHeightM = (state.columnHeights[colIndex] ?? state.height) / 100;

      // No top module if no boundary
      if (moduleBoundary === null || moduleBoundary === undefined) {
        return state;
      }

      // Clamp Y within top module bounds (10cm margin from boundary and top)
      const minY = moduleBoundary + 0.1;
      const maxY = colHeightM - 0.1;
      shelves[shelfIndex] = Math.max(minY, Math.min(maxY, newY));

      // Re-sort to maintain order
      shelves.sort((a, b) => a - b);

      return {
        columnTopModuleShelves: {
          ...state.columnTopModuleShelves,
          [colIndex]: shelves,
        },
      };
    }),

  // Preview mode - disables all editing controls in admin preview pages
  isPreviewMode: false,
  setIsPreviewMode: (val) => set({ isPreviewMode: val }),

  // Reset store to initial defaults (for loading fresh wardrobes in admin preview)
  // This prevents stale state from polluting views when navigating between wardrobes
  resetToDefaults: () =>
    set((state) => {
      // Default dimensions
      const defaultWidth = 210;
      const defaultHeight = 240;
      const defaultDepth = 60;
      const defaultWidthM = defaultWidth / 100;
      const defaultHeightM = defaultHeight / 100;

      // Compute default vertical boundaries for 210cm width
      const defaultVerticalBoundaries = getDefaultBoundariesX(defaultWidthM);
      const columnCount = defaultVerticalBoundaries.length + 1;

      // Compute default module boundaries for 240cm height (> 200cm threshold)
      const defaultModuleBoundaries: Record<number, number> = {};
      if (defaultHeightM > TARGET_BOTTOM_HEIGHT) {
        const initialBoundary = Math.min(
          MAX_MODULE_HEIGHT,
          defaultHeightM - MIN_TOP_HEIGHT,
        );
        for (let i = 0; i < columnCount; i++) {
          defaultModuleBoundaries[i] = initialBoundary;
        }
      }

      return {
        // Dimensions
        width: defaultWidth,
        height: defaultHeight,
        depth: defaultDepth,
        panelThickness: 2,
        numberOfColumns: 2,
        columnWidths: [1, 1],

        // View state
        viewMode: "3D" as ViewMode,
        showDimensions: true,
        showEdgesOnly: false,
        showInfoButtons: false,
        showDoors: true,

        // Material selections - keep materials array but reset IDs
        // (setMaterials will auto-select appropriate materials)
        selectedMaterial: "default",
        selectedMaterialId: 1,
        selectedFrontMaterialId: undefined,
        selectedBackMaterialId: undefined,
        // Preserve materials and handles (loaded from DB)
        materials: state.materials,
        handles: state.handles,

        // Row/shelf config
        rowCounts: [0, 0],

        // Element configurations
        selectedElementKey: null,
        elementConfigs: {},

        // Base/plinth
        hasBase: false,
        baseHeight: 3,

        // Extras
        extrasMode: false,
        selectedCompartmentKey: null,
        hoveredCompartmentKey: null,
        compartmentExtras: {},

        // Doors
        selectedDoorElementKey: null,
        doorSelections: {},
        doorSelectionDragging: false,
        doorSelectionStart: null,
        doorSelectionCurrent: null,
        selectedDoorCompartments: [],
        doorGroups: [],
        globalHandleId: "handle_1",
        globalHandleFinish: "chrome",
        doorSettingsMode: "global" as DoorSettingsMode,

        // UI state
        activeAccordionStep: "item-1",

        // Loaded wardrobe tracking - clear on reset
        loadedWardrobeId: null,
        loadedWardrobeIsModel: false,

        // Order context - clear on reset
        fromOrderId: null,
        fromOrderNumber: null,

        // Wardrobe context - clear on reset
        fromWardrobeId: null,
        fromWardrobeName: null,

        // Saved snapshot - clear on reset
        lastSavedSnapshot: null,
        isSaving: false,
        lastSaveTime: null,

        // Structural boundaries
        verticalBoundaries: defaultVerticalBoundaries,
        columnHorizontalBoundaries: {},
        columnHeights: {},
        columnModuleBoundaries: defaultModuleBoundaries,
        columnTopModuleShelves: {},

        // Interaction state
        isDragging: false,
        hoveredColumnIndex: null,
        selectedColumnIndex: null,

        // Keep isPreviewMode as-is (controlled by the page)
        isPreviewMode: state.isPreviewMode,
      };
    }),
}));
