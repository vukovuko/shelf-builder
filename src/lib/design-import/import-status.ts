import { create } from "zustand";

/** Whether an uploaded sketch is being read, so the 3D view can show it. */
export const useDesignImportStatus = create<{
  pending: boolean;
  setPending: (pending: boolean) => void;
}>((set) => ({
  pending: false,
  setPending: (pending) => set({ pending }),
}));
