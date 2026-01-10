import { create } from "zustand";

// Define the view modes for the application
export type ViewMode = "3D" | "2D" | "Sizing";

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
  selectedBackMaterialId?: number;
  showDimensions: boolean;
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
  selectedBackMaterialId: undefined,
  showDimensions: false,
  setWidth: (width) => set({ width }),
  setHeight: (height) => set({ height }),
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
  baseHeight: 0,
  setHasBase: (val) => set({ hasBase: val }),
  setBaseHeight: (val) => set({ baseHeight: Math.max(0, val) }),
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
}));
