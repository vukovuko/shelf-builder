import { create } from "zustand";
import {
  MAX_SHELVES_PER_COLUMN,
  getMaxShelvesForHeight,
  distributeShelvesEvenly,
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

interface ElementConfig {
  columns: number; // number of compartments in this element (dividers + 1)
  rowCounts: number[]; // shelves per compartment
}

interface CompartmentExtras {
  verticalDivider?: boolean;
  drawers?: boolean;
  drawersCount?: number; // number of drawers for this element (when drawers is enabled)
  rod?: boolean;
  led?: boolean;
}

interface ShelfState {
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
  showInfoButtons: boolean;
  setShowInfoButtons: (show: boolean) => void;
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

      // Calculate correct boundaries for new width (auto column count based on 100cm max)
      const newBoundaries = getDefaultBoundariesX(newWidthM);
      const newColumnCount = newBoundaries.length + 1;
      const oldColumnCount = state.verticalBoundaries.length + 1;

      // If column count decreased, clean up per-column data for removed columns
      let newColumnHorizontalBoundaries = state.columnHorizontalBoundaries;
      let newColumnHeights = state.columnHeights;

      if (newColumnCount < oldColumnCount) {
        // Remove data for columns that no longer exist
        newColumnHorizontalBoundaries = {};
        newColumnHeights = {};
        for (let i = 0; i < newColumnCount; i++) {
          if (state.columnHorizontalBoundaries[i]) {
            newColumnHorizontalBoundaries[i] =
              state.columnHorizontalBoundaries[i];
          }
          if (state.columnHeights[i] !== undefined) {
            newColumnHeights[i] = state.columnHeights[i];
          }
        }
      }

      return {
        width: newWidth,
        verticalBoundaries: newBoundaries,
        columnHorizontalBoundaries: newColumnHorizontalBoundaries,
        columnHeights: newColumnHeights,
      };
    }),
  setHeight: (newHeight) =>
    set((state) => {
      const oldHeightM = state.height / 100;
      const newHeightM = newHeight / 100;

      // Scale horizontal boundaries for columns using global height
      const newColumnBoundaries = { ...state.columnHorizontalBoundaries };

      Object.keys(newColumnBoundaries).forEach((key) => {
        const colIdx = Number(key);
        // Only scale if column uses global height (no custom height set)
        if (state.columnHeights[colIdx] === undefined) {
          const oldBoundaries = newColumnBoundaries[colIdx] || [];
          newColumnBoundaries[colIdx] = oldBoundaries.map(
            (y) => (y / oldHeightM) * newHeightM,
          );
        }
      });

      return {
        height: newHeight,
        columnHorizontalBoundaries: newColumnBoundaries,
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
      return {
        elementConfigs: {
          ...state.elementConfigs,
          [key]: { columns, rowCounts },
        },
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
      return {
        elementConfigs: {
          ...state.elementConfigs,
          [key]: { columns: current.columns, rowCounts },
        },
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
  showInfoButtons: false,
  setShowInfoButtons: (show) => set({ showInfoButtons: show }),
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
  // Empty array = auto-calculate equal segments
  // These seams span FULL HEIGHT of the wardrobe
  verticalBoundaries: [],
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

      // Clamp count to valid range
      const maxShelves = getMaxShelvesForHeight(columnHeightCm);
      const clampedCount = Math.max(0, Math.min(count, maxShelves));

      // Calculate evenly-distributed positions
      const newBoundaries = distributeShelvesEvenly(
        columnHeightM,
        clampedCount,
        panelThicknessM,
      );

      return {
        columnHorizontalBoundaries: {
          ...state.columnHorizontalBoundaries,
          [colIndex]: newBoundaries,
        },
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
      const oldBoundaries = state.columnHorizontalBoundaries[colIdx] || [];
      let newColumnBoundaries = state.columnHorizontalBoundaries;

      // Scale ALL horizontal boundaries proportionally when height changes
      if (oldBoundaries.length > 0 && oldHeightCm > 0) {
        const scaledBoundaries = oldBoundaries.map((y) => {
          const ratio = y / (oldHeightCm / 100); // ratio relative to old height
          return ratio * (heightCm / 100); // apply ratio to new height
        });
        newColumnBoundaries = {
          ...newColumnBoundaries,
          [colIdx]: scaledBoundaries,
        };
      }

      return {
        columnHeights: { ...state.columnHeights, [colIdx]: heightCm },
        columnHorizontalBoundaries: newColumnBoundaries,
      };
    }),
  resetColumnHeights: () => set({ columnHeights: {} }),
  // Hovered column for bottom bar controls
  hoveredColumnIndex: null,
  setHoveredColumnIndex: (idx) => set({ hoveredColumnIndex: idx }),
}));
