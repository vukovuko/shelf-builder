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
    // Per-column module boundaries (Y position where modules split)
    columnModuleBoundaries: s.columnModuleBoundaries,
    // Per-column top module shelves (Y positions in top module)
    columnTopModuleShelves: s.columnTopModuleShelves,
    // Door groups (with per-door material and handle settings)
    doorGroups: s.doorGroups,
    // Global handle selection
    globalHandleId: s.globalHandleId,
    // Global handle finish selection
    globalHandleFinish: s.globalHandleFinish,
    // Door settings mode (global vs per-door)
    doorSettingsMode: s.doorSettingsMode,
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

  // Migrate old doorSelections to new doorGroups format
  // Only migrate if doorGroups doesn't exist or is empty, but doorSelections has data
  let doorGroups = data.doorGroups || [];
  const doorSelections = data.doorSelections || {};

  if (doorGroups.length === 0 && Object.keys(doorSelections).length > 0) {
    // Convert each doorSelection entry to a doorGroup
    // Each old entry becomes a single-compartment door group
    doorGroups = Object.entries(doorSelections)
      .filter(([, type]) => type && type !== "none")
      .map(([compKey, type]) => {
        // Parse column letter from compKey (e.g., "A1" -> "A")
        const match = compKey.match(/^([A-Z]+)/);
        const column = match ? match[1] : "A";
        return {
          id: `door-${compKey}`,
          type: type as string,
          compartments: [compKey],
          column,
        };
      });
  }

  (useShelfStore as any).setState((prev: any) => ({
    compartmentExtras: {
      ...prev.compartmentExtras,
      ...(data.compartmentExtras || {}),
    },
    doorSelections: { ...doorSelections },
    hasBase: data.hasBase,
    baseHeight: data.baseHeight,
    verticalBoundaries: data.verticalBoundaries || [],
    columnHorizontalBoundaries,
    columnHeights: data.columnHeights || {},
    columnModuleBoundaries: data.columnModuleBoundaries || {},
    columnTopModuleShelves: data.columnTopModuleShelves || {},
    // Door groups with per-door settings (migrated from old format if needed)
    doorGroups,
    // Global handle (default: "handle_1")
    globalHandleId: data.globalHandleId || "handle_1",
    // Global handle finish (default: "chrome")
    globalHandleFinish: data.globalHandleFinish || "chrome",
    // Door settings mode (default: "global")
    doorSettingsMode: data.doorSettingsMode || "global",
  }));
}
