import { create } from "zustand";

// Define the new type for our camera modes
export type CameraMode = "2D" | "3D";

interface ShelfState {
  width: number;
  height: number;
  depth: number;
  panelThickness: number;
  numberOfColumns: number;
  cameraMode: CameraMode; // New
  setWidth: (width: number) => void;
  setHeight: (height: number) => void;
  setDepth: (depth: number) => void;
  setPanelThickness: (thickness: number) => void;
  setNumberOfColumns: (columns: number) => void;
  setCameraMode: (mode: CameraMode) => void; // New
}

export const useShelfStore = create<ShelfState>(set => ({
  width: 210,
  height: 201,
  depth: 60,
  panelThickness: 2,
  numberOfColumns: 2,
  cameraMode: "2D", // Default to locked 2D view
  setWidth: width => set({ width }),
  setHeight: height => set({ height }),
  setDepth: depth => set({ depth }),
  setPanelThickness: panelThickness => set({ panelThickness }),
  setNumberOfColumns: numberOfColumns => set({ numberOfColumns }),
  setCameraMode: cameraMode => set({ cameraMode }),
}));
