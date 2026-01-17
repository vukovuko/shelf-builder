import { useShelfStore } from "./store";

export function getWardrobeSnapshot() {
  const s = useShelfStore.getState() as any;
  return {
    width: s.width,
    height: s.height,
    depth: s.depth,
    panelThickness: s.panelThickness,
    selectedMaterialId: s.selectedMaterialId,
    selectedFrontMaterialId: s.selectedFrontMaterialId,
    selectedBackMaterialId: s.selectedBackMaterialId,
    elementConfigs: s.elementConfigs,
    compartmentExtras: s.compartmentExtras,
    doorSelections: s.doorSelections,
    hasBase: s.hasBase,
    baseHeight: s.baseHeight,
    // Vertical seam positions (full height seams)
    verticalBoundaries: s.verticalBoundaries,
    // Per-column horizontal boundaries (array of Y positions per column)
    columnHorizontalBoundaries: s.columnHorizontalBoundaries,
    // Per-column heights (independent heights)
    columnHeights: s.columnHeights,
  };
}

export function applyWardrobeSnapshot(data: any) {
  const st: any = useShelfStore.getState();
  if (data.width) st.setWidth(data.width);
  if (data.height) st.setHeight(data.height);
  if (data.depth) st.setDepth(data.depth);
  if (data.panelThickness) st.setPanelThickness(data.panelThickness);
  if (data.selectedMaterialId)
    st.setSelectedMaterialId(data.selectedMaterialId);
  if (data.selectedFrontMaterialId)
    st.setSelectedFrontMaterialId(data.selectedFrontMaterialId);
  if (data.selectedBackMaterialId)
    st.setSelectedBackMaterialId(data.selectedBackMaterialId);
  Object.entries(data.elementConfigs || {}).forEach(([key, cfg]: any) => {
    st.setElementColumns(key, cfg.columns || 1);
    (cfg.rowCounts || []).forEach((cnt: number, idx: number) =>
      st.setElementRowCount(key, idx, cnt),
    );
  });

  // Per-column horizontal boundaries - migrate old format (single value) to new (array)
  const rawBoundaries = data.columnHorizontalBoundaries || {};
  const columnHorizontalBoundaries: Record<number, number[]> = {};
  Object.entries(rawBoundaries).forEach(([key, value]) => {
    const colIdx = Number(key);
    if (Array.isArray(value)) {
      // New format - already an array
      columnHorizontalBoundaries[colIdx] = value;
    } else if (typeof value === "number") {
      // Old format - single value, convert to array
      columnHorizontalBoundaries[colIdx] = [value];
    }
    // null/undefined values are skipped (no shelves)
  });

  (useShelfStore as any).setState((prev: any) => ({
    compartmentExtras: {
      ...prev.compartmentExtras,
      ...(data.compartmentExtras || {}),
    },
    doorSelections: { ...data.doorSelections },
    hasBase: data.hasBase,
    baseHeight: data.baseHeight,
    verticalBoundaries: data.verticalBoundaries || [],
    columnHorizontalBoundaries,
    columnHeights: data.columnHeights || {},
  }));
}
