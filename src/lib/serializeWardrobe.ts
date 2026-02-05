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

  // Grab module boundaries that setHeight computed (for heights > 200cm)
  // We'll use these if saved data didn't have boundaries
  const computedModuleBoundaries =
    useShelfStore.getState().columnModuleBoundaries;
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

  // Validate and fix columnModuleBoundaries (fix for bug where boundaries got progressively shrunken)
  // The boundary must be valid for the column height - at least MIN_TOP_HEIGHT from top and bottom
  const MIN_TOP_HEIGHT = 0.1; // 10cm minimum module height
  const savedModuleBoundaries = data.columnModuleBoundaries || {};
  const savedColumnHeights = data.columnHeights || {};
  const globalHeightM = (data.height || 200) / 100;
  const fixedModuleBoundaries: Record<number, number> = {};

  Object.entries(savedModuleBoundaries).forEach(([key, value]) => {
    const colIdx = Number(key);
    const boundary = value as number;
    if (boundary === null || boundary === undefined) return;

    // Get the column height (custom or global)
    const colHeightCm = savedColumnHeights[colIdx] ?? data.height ?? 200;
    const colHeightM = colHeightCm / 100;

    // Clamp boundary to valid range for the column height
    const minY = MIN_TOP_HEIGHT;
    const maxY = colHeightM - MIN_TOP_HEIGHT;
    const clampedBoundary = Math.max(minY, Math.min(maxY, boundary));

    fixedModuleBoundaries[colIdx] = clampedBoundary;
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
    // Use saved boundaries if they exist, otherwise keep what setHeight computed
    columnModuleBoundaries:
      Object.keys(fixedModuleBoundaries).length > 0
        ? fixedModuleBoundaries
        : computedModuleBoundaries,
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
