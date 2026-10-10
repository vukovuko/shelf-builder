import { create } from "zustand";

/** What is being turned into a wardrobe right now, so the 3D view can show it. */
export type ImportSource = "image" | "text";

export const useDesignImportStatus = create<{
  pending: ImportSource | null;
  setPending: (pending: ImportSource | null) => void;
}>((set) => ({
  pending: null,
  setPending: (pending) => set({ pending }),
}));
