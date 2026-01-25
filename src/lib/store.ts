import { create } from "zustand";
import {
  MAX_SHELVES_PER_COLUMN,
  getMaxShelvesForHeight,
  distributeShelvesEvenly,
  TARGET_BOTTOM_HEIGHT,
  MIN_TOP_HEIGHT,
  MAX_MODULE_HEIGHT,
  DEFAULT_PANEL_THICKNESS_M,
} from "./wardrobe-constants";
import { getDefaultBoundariesX } from "./wardrobe-utils";

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
}

interface ElementConfig {
  columns: number; // number of compartments in this element (dividers + 1)
  rowCounts: number[]; // shelves per compartment
  drawerCounts?: number[]; // drawers per compartment (max = rowCounts[i] + 1)
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
  // Per-element configuration
  selectedElementKey: string | null;
  setSelectedElementKey: (key: string | null) => void;
  elementConfigs: Record<string, ElementConfig>;
  setElementColumns: (key: string, columns: number) => void;
  setElementRowCount: (key: string, index: number, count: number) => void;
  setElementDrawerCount: (key: string, index: number, count: number) => void;
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
}

export const useShelfStore = create<ShelfState>((set) => ({
  width: 210,
  height: 201,
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
  showDimensions: false,
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

      return {
        width: newWidth,
        verticalBoundaries: newBoundaries,
        columnHorizontalBoundaries: newColumnHorizontalBoundaries,
        columnHeights: newColumnHeights,
        columnModuleBoundaries: newColumnModuleBoundaries,
        columnTopModuleShelves: newColumnTopModuleShelves,
      };
    }),
  setHeight: (newHeight) =>
    set((state) => {
      const newHeightM = newHeight / 100;

      // Scale ALL horizontal boundaries proportionally PER COLUMN
      // Each column uses its ACTUAL height (from columnHeights or global)
      const newColumnBoundaries: Record<number, number[]> = {};
      Object.keys(state.columnHorizontalBoundaries).forEach((key) => {
        const colIdx = Number(key);
        const oldColHeightCm = state.columnHeights[colIdx] ?? state.height;
        const oldColHeightM = oldColHeightCm / 100;
        const oldBoundaries = state.columnHorizontalBoundaries[colIdx] || [];

        // Scale shelves from old COLUMN height to new global height
        newColumnBoundaries[colIdx] = oldBoundaries.map(
          (y) => (y / oldColHeightM) * newHeightM,
        );
      });

      // Handle module boundaries: scale or remove based on new height
      let newModuleBoundaries: Record<number, number | null> = {};
      let newTopModuleShelves: Record<number, number[]> = {};

      if (newHeightM > TARGET_BOTTOM_HEIGHT) {
        // Scale existing module boundaries and top module shelves per-column
        Object.keys(state.columnModuleBoundaries).forEach((key) => {
          const colIdx = Number(key);
          const oldBoundary = state.columnModuleBoundaries[colIdx];
          if (oldBoundary === null || oldBoundary === undefined) return;

          const oldColHeightCm = state.columnHeights[colIdx] ?? state.height;
          const oldColHeightM = oldColHeightCm / 100;

          // Scale module boundary
          const ratio = oldBoundary / oldColHeightM;
          let scaledBoundary = ratio * newHeightM;
          // Clamp to valid range: NO module can exceed 200cm
          const minY = Math.max(
            MIN_TOP_HEIGHT, // Bottom >= 10cm
            newHeightM - MAX_MODULE_HEIGHT, // Top <= 200cm
          );
          const maxY = Math.min(
            newHeightM - MIN_TOP_HEIGHT, // Top >= 10cm
            MAX_MODULE_HEIGHT, // Bottom <= 200cm
          );
          scaledBoundary = Math.max(minY, Math.min(maxY, scaledBoundary));
          newModuleBoundaries[colIdx] = scaledBoundary;

          // Scale top module shelves
          const topShelves = state.columnTopModuleShelves[colIdx] || [];
          if (topShelves.length > 0) {
            const oldTopModuleHeight = oldColHeightM - oldBoundary;
            const newTopModuleHeight = newHeightM - scaledBoundary;

            if (newTopModuleHeight < 0.2) {
              newTopModuleShelves[colIdx] = []; // Too small, clear
            } else {
              newTopModuleShelves[colIdx] = topShelves
                .map((shelfY) => {
                  const relativePos =
                    (shelfY - oldBoundary) / oldTopModuleHeight;
                  return scaledBoundary + relativePos * newTopModuleHeight;
                })
                .filter(
                  (y) => y > scaledBoundary + 0.1 && y < newHeightM - 0.1,
                );
            }
          } else {
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
      }
      // If newHeightM <= TARGET_BOTTOM_HEIGHT, boundaries stay empty (no top module)

      return {
        height: newHeight,
        columnHeights: {}, // Reset ALL manual column heights (intentional)
        columnHorizontalBoundaries: newColumnBoundaries,
        columnModuleBoundaries: newModuleBoundaries,
        columnTopModuleShelves: newTopModuleShelves,
      };
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
      const rowCounts = [...current.rowCounts];
      // Ensure index exists
      if (index >= rowCounts.length) {
        rowCounts.length = index + 1;
        for (let i = 0; i < rowCounts.length; i++)
          if (rowCounts[i] == null) rowCounts[i] = 0;
      }
      rowCounts[index] = count;
      // Clear rod/LED if compartment now has subdivisions
      const hasSubdivisions =
        (current.columns ?? 1) > 1 ||
        rowCounts.some((c) => c > 0) ||
        (current.drawerCounts?.some((c) => c > 0) ?? false);
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
          [key]: { ...current, rowCounts },
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
  // Base defaults
  hasBase: false,
  baseHeight: 3,
  setHasBase: (val) => set({ hasBase: val }),
  setBaseHeight: (val) => set({ baseHeight: Math.max(3, val) }),
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
          doorSelectionStart: null,
          doorSelectionCurrent: null,
          selectedDoorCompartments: [...existingGroup.compartments],
        };
      }

      // Start new selection (dragging)
      return {
        doorSelectionDragging: true,
        doorSelectionStart: compKey,
        doorSelectionCurrent: compKey,
        selectedDoorCompartments: [compKey],
      };
    }),
  updateDoorSelectionDrag: (compKey: string) =>
    set((state) => {
      if (!state.doorSelectionDragging || !state.doorSelectionStart)
        return state;

      // Parse column letter and compartment index from keys
      const startMatch = state.doorSelectionStart.match(/^([A-Z]+)(\d+)$/);
      const currentMatch = compKey.match(/^([A-Z]+)(\d+)$/);

      if (!startMatch || !currentMatch) return state;

      const startCol = startMatch[1];
      const currentCol = currentMatch[1];

      // Only allow selection within same column
      if (startCol !== currentCol) return state;

      const startIdx = parseInt(startMatch[2], 10);
      const currentIdx = parseInt(currentMatch[2], 10);

      // Generate range of compartment keys
      const minIdx = Math.min(startIdx, currentIdx);
      const maxIdx = Math.max(startIdx, currentIdx);
      let selected: string[] = [];
      for (let i = minIdx; i <= maxIdx; i++) {
        selected.push(`${startCol}${i}`);
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
        const aMatch = a.match(/^([A-Z]+)(\d+)$/);
        const bMatch = b.match(/^([A-Z]+)(\d+)$/);
        if (!aMatch || !bMatch) return 0;
        if (aMatch[1] !== bMatch[1]) return aMatch[1].localeCompare(bMatch[1]);
        return parseInt(aMatch[2], 10) - parseInt(bMatch[2], 10);
      });

      return {
        doorSelectionCurrent: compKey,
        selectedDoorCompartments: selected,
      };
    }),
  endDoorSelection: () =>
    set((state) => ({
      doorSelectionDragging: false,
      // Keep selectedDoorCompartments for UI to show options
    })),
  clearDoorSelection: () =>
    set({
      doorSelectionDragging: false,
      doorSelectionStart: null,
      doorSelectionCurrent: null,
      selectedDoorCompartments: [],
    }),
  setDoorForSelection: (type) =>
    set((state) => {
      if (state.selectedDoorCompartments.length === 0) return state;

      const selectedComps = [...state.selectedDoorCompartments].sort((a, b) => {
        const aMatch = a.match(/^([A-Z]+)(\d+)$/);
        const bMatch = b.match(/^([A-Z]+)(\d+)$/);
        if (!aMatch || !bMatch) return 0;
        if (aMatch[1] !== bMatch[1]) return aMatch[1].localeCompare(bMatch[1]);
        return parseInt(aMatch[2], 10) - parseInt(bMatch[2], 10);
      });

      // Get column letter from first compartment
      const firstMatch = selectedComps[0].match(/^([A-Z]+)(\d+)$/);
      const column = firstMatch?.[1] ?? "A";

      // Generate group ID
      const firstComp = selectedComps[0];
      const lastComp = selectedComps[selectedComps.length - 1];
      const groupId =
        firstComp === lastComp
          ? `door-${firstComp}`
          : `door-${firstComp}-${lastComp}`;

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

      // Create new door group
      const newGroup: DoorGroup = {
        id: groupId,
        type,
        compartments: selectedComps,
        column,
      };

      // Also update doorSelections for backward compatibility with cut list
      const newSelections = { ...state.doorSelections };
      for (const key of selectedComps) {
        newSelections[key] = type;
      }

      return {
        doorGroups: [...newGroups, newGroup],
        doorSelections: newSelections,
        // Clear selection after applying
        doorSelectionDragging: false,
        doorSelectionStart: null,
        doorSelectionCurrent: null,
        selectedDoorCompartments: [],
      };
    }),
  showInfoButtons: false,
  setShowInfoButtons: (show) => set({ showInfoButtons: show }),
  // Track which accordion step is open (for Step 2 mode: hide labels, show circles)
  activeAccordionStep: "item-1", // Default to Step 1 open
  setActiveAccordionStep: (step) =>
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
    })),
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
  // Vertical structural boundaries (seam X positions in meters from center)
  // Initialize based on default width (210cm → 3 columns)
  // These seams span FULL HEIGHT of the wardrobe
  verticalBoundaries: getDefaultBoundariesX(210 / 100),
  setVerticalBoundary: (index, x) =>
    set((state) => {
      const boundaries = [...state.verticalBoundaries];
      boundaries[index] = x;
      return { verticalBoundaries: boundaries };
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

      // Scale ALL horizontal boundaries proportionally when height changes
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
          // Scale existing boundary proportionally
          const ratio = existingModuleBoundary / oldHeightM;
          let scaledBoundary = ratio * newHeightM;
          // Clamp to valid range: NO module can exceed 200cm
          const minY = Math.max(
            MIN_TOP_HEIGHT, // Bottom >= 10cm
            newHeightM - MAX_MODULE_HEIGHT, // Top <= 200cm
          );
          const maxY = Math.min(
            newHeightM - MIN_TOP_HEIGHT, // Top >= 10cm
            MAX_MODULE_HEIGHT, // Bottom <= 200cm
          );
          scaledBoundary = Math.max(minY, Math.min(maxY, scaledBoundary));
          newModuleBoundaries = {
            ...newModuleBoundaries,
            [colIdx]: scaledBoundary,
          };

          // Scale top module shelves proportionally if they exist
          const topShelves = state.columnTopModuleShelves[colIdx] || [];
          if (topShelves.length > 0) {
            const oldTopModuleHeight = oldHeightM - existingModuleBoundary;
            const newTopModuleHeight = newHeightM - scaledBoundary;

            if (newTopModuleHeight < 0.2) {
              // Top module too small, clear shelves
              newTopModuleShelves = {
                ...newTopModuleShelves,
                [colIdx]: [],
              };
            } else {
              // Scale shelves
              const scaledShelves = topShelves
                .map((shelfY) => {
                  const relativePos =
                    (shelfY - existingModuleBoundary) / oldTopModuleHeight;
                  return scaledBoundary + relativePos * newTopModuleHeight;
                })
                .filter(
                  (y) => y > scaledBoundary + 0.1 && y < newHeightM - 0.1,
                );

              newTopModuleShelves = {
                ...newTopModuleShelves,
                [colIdx]: scaledShelves,
              };
            }
          }
        }
      } else {
        // Height below threshold - remove module boundary AND clear top module shelves
        if (
          existingModuleBoundary !== undefined &&
          existingModuleBoundary !== null
        ) {
          newModuleBoundaries = {
            ...newModuleBoundaries,
            [colIdx]: null,
          };
          // Clear top module shelves since there's no top module anymore
          newTopModuleShelves = {
            ...newTopModuleShelves,
            [colIdx]: [],
          };
        }
      }

      // Auto-sync: if new column height exceeds global, update global height
      // This ensures sidebar always shows the actual bounding box
      const newGlobalHeight = Math.max(state.height, heightCm);

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

      return {
        height: newGlobalHeight,
        columnHeights: { ...state.columnHeights, [colIdx]: heightCm },
        columnHorizontalBoundaries: newColumnBoundaries,
        columnModuleBoundaries: newModuleBoundaries,
        columnTopModuleShelves: newTopModuleShelves,
      };
    }),
  resetColumnHeights: () => set({ columnHeights: {} }),
  // Hovered column for bottom bar controls
  hoveredColumnIndex: null,
  setHoveredColumnIndex: (idx) => set({ hoveredColumnIndex: idx }),
  // Per-column module boundaries (Y position where modules split, in meters)
  // Initialize for ALL columns based on default width (210cm → 3 columns) and height (201cm)
  // For 201cm height: boundary at 191cm (bottom 191cm, top 10cm)
  columnModuleBoundaries: (() => {
    const defaultWidthM = 210 / 100; // 2.1m (matches default width: 210)
    const defaultHeightM = 201 / 100; // 2.01m (matches default height: 201)
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
          // Scale shelves proportionally within new top module bounds
          const scaledShelves = topShelves
            .map((shelfY) => {
              // Convert to relative position within old top module
              const relativePos = (shelfY - oldBoundary) / oldTopModuleHeight;
              // Apply to new top module
              return clampedY + relativePos * newTopModuleHeight;
            })
            .filter((y) => y > clampedY + 0.1 && y < colHeightM - 0.1); // Remove invalid positions

          newTopShelves = {
            ...state.columnTopModuleShelves,
            [colIdx]: scaledShelves,
          };
        }
      }

      return {
        columnModuleBoundaries: {
          ...state.columnModuleBoundaries,
          [colIdx]: clampedY,
        },
        columnTopModuleShelves: newTopShelves,
      };
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
}));
