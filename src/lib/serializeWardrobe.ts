import { useShelfStore } from "./store";
import { buildModulesY } from "./wardrobe-utils";

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
    // NEW: Per-module vertical boundaries
    moduleVerticalBoundaries: s.moduleVerticalBoundaries,
    // NEW: Per-column horizontal boundaries
    columnHorizontalBoundaries: s.columnHorizontalBoundaries,
    // DEPRECATED: Keep for backward compatibility when loading old formats
    horizontalBoundary: s.horizontalBoundary,
    verticalBoundaries: s.verticalBoundaries,
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

  // Migration: Convert old verticalBoundaries format to new moduleVerticalBoundaries format
  let moduleVerticalBoundaries = data.moduleVerticalBoundaries || {};
  if (
    data.verticalBoundaries &&
    data.verticalBoundaries.length > 0 &&
    (!data.moduleVerticalBoundaries ||
      Object.keys(data.moduleVerticalBoundaries).length === 0)
  ) {
    // Old saved wardrobe: apply same boundaries to all modules
    const h = (data.height || 200) / 100;
    const modulesY = buildModulesY(h, true, data.horizontalBoundary);
    modulesY.forEach((m) => {
      const moduleKey = m.label ?? "SingleModule";
      moduleVerticalBoundaries[moduleKey] = [...data.verticalBoundaries];
    });
  }

  // Migration: Convert old horizontalBoundary to new columnHorizontalBoundaries format
  // If old data has horizontalBoundary but no columnHorizontalBoundaries, we leave columnHorizontalBoundaries
  // empty so all columns fall back to the global horizontalBoundary
  let columnHorizontalBoundaries = data.columnHorizontalBoundaries || {};

  (useShelfStore as any).setState((prev: any) => ({
    compartmentExtras: {
      ...prev.compartmentExtras,
      ...(data.compartmentExtras || {}),
    },
    doorSelections: { ...data.doorSelections },
    hasBase: data.hasBase,
    baseHeight: data.baseHeight,
    // NEW: Per-module vertical boundaries
    moduleVerticalBoundaries,
    // NEW: Per-column horizontal boundaries
    columnHorizontalBoundaries,
    // DEPRECATED: Keep for backward compatibility
    horizontalBoundary: data.horizontalBoundary ?? null,
    verticalBoundaries: data.verticalBoundaries || [],
  }));
}
