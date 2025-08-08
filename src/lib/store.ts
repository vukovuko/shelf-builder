import { create } from "zustand";

// Define the new type for our camera modes
export type CameraMode = "2D" | "3D";

interface ElementConfig {
  columns: number; // number of compartments in this element (dividers + 1)
  rowCounts: number[]; // shelves per compartment
}

interface ShelfState {
  width: number;
  height: number;
  depth: number;
  panelThickness: number;
  numberOfColumns: number;
  columnWidths: number[]; // New: array of column widths
  cameraMode: CameraMode;
  rowCounts: number[]; // New: number of shelves per column
  selectedMaterial: string;
  selectedMaterialId: number;
  showDimensions: boolean;
  setWidth: (width: number) => void;
  setHeight: (height: number) => void;
  setDepth: (depth: number) => void;
  setPanelThickness: (thickness: number) => void;
  setNumberOfColumns: (columns: number) => void;
  setColumnWidth: (index: number, width: number) => void; // New
  setCameraMode: (mode: CameraMode) => void;
  setRowCount: (index: number, count: number) => void;
  setSelectedMaterial: (material: string) => void;
  setSelectedMaterialId: (id: number) => void;
  setShowDimensions: (show: boolean) => void;
  showEdgesOnly: boolean;
  setShowEdgesOnly: (show: boolean) => void;
  // Per-element configuration
  selectedElementKey: string | null;
  setSelectedElementKey: (key: string | null) => void;
  elementConfigs: Record<string, ElementConfig>;
  setElementColumns: (key: string, columns: number) => void;
  setElementRowCount: (key: string, index: number, count: number) => void;
}

export const useShelfStore = create<ShelfState>(set => ({
  width: 210,
  height: 201,
  depth: 60,
  panelThickness: 2,
  numberOfColumns: 2,
  columnWidths: [1, 1], // Default to 1 for each column
  cameraMode: "2D",
  rowCounts: [0, 0], // Default 0 shelf per column
  selectedMaterial: "default", // or your default material key
  selectedMaterialId: 1, // default to first material
  showDimensions: false,
  setWidth: width => set({ width }),
  setHeight: height => set({ height }),
  setDepth: depth => set({ depth }),
  setPanelThickness: panelThickness => set({ panelThickness }),
  setNumberOfColumns: numberOfColumns =>
    set(state => {
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
    set(state => {
      const columnWidths = [...state.columnWidths];
      columnWidths[index] = width;
      return { columnWidths };
    }),
  setCameraMode: cameraMode => set({ cameraMode }),
  setRowCount: (index, count) =>
    set(state => {
      const rowCounts = [...state.rowCounts];
      rowCounts[index] = count;
      return { rowCounts };
    }),
  setSelectedMaterial: material => set({ selectedMaterial: material }),
  setSelectedMaterialId: id => set({ selectedMaterialId: id }),
  setShowDimensions: show => set({ showDimensions: show }),
  showEdgesOnly: false,
  setShowEdgesOnly: show => set({ showEdgesOnly: show }),
  // Per-element configuration defaults
  selectedElementKey: null,
  setSelectedElementKey: key => set({ selectedElementKey: key }),
  elementConfigs: {},
  setElementColumns: (key, columns) =>
    set(state => {
      const current = state.elementConfigs[key] ?? { columns: 1, rowCounts: [0] };
      // Adjust rowCounts length to match new columns
      let rowCounts = [...current.rowCounts];
      if (columns > rowCounts.length) {
        rowCounts = [...rowCounts, ...Array(columns - rowCounts.length).fill(0)];
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
    set(state => {
      const current = state.elementConfigs[key] ?? { columns: 1, rowCounts: [0] };
      const rowCounts = [...current.rowCounts];
      // Ensure index exists
      if (index >= rowCounts.length) {
        rowCounts.length = index + 1;
        for (let i = 0; i < rowCounts.length; i++) if (rowCounts[i] == null) rowCounts[i] = 0;
      }
      rowCounts[index] = count;
      return {
        elementConfigs: {
          ...state.elementConfigs,
          [key]: { columns: current.columns, rowCounts },
        },
      };
    }),
}));
