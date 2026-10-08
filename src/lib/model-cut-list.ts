import type { SerializedAccessoryRule } from "@/lib/accessory-rules";
import { type CutList, calculateCutList } from "@/lib/calcCutList";
import { applyWardrobeSnapshot } from "@/lib/serializeWardrobe";
import { type Material, useShelfStore } from "@/lib/store";

/**
 * Cut list of a saved design, as checkout prices it: the design goes through
 * the configurator store first (which also repairs older saved data) and is
 * read back with the same fields checkout sends to calculateCutList. Leaves
 * the store at its defaults afterwards. For event handlers, not render code.
 */
export function cutListForSavedDesign(
  data: unknown,
  materials: Material[],
  accessoryRules: SerializedAccessoryRule[],
): CutList {
  const store = useShelfStore.getState();
  store.resetToDefaults();
  applyWardrobeSnapshot(data);
  const s = useShelfStore.getState();
  const cutList = calculateCutList(
    {
      width: s.width,
      height: s.height,
      depth: s.depth,
      selectedMaterialId: Number(s.selectedMaterialId),
      selectedFrontMaterialId: s.selectedFrontMaterialId,
      selectedBackMaterialId: s.selectedBackMaterialId,
      selectedEdgeMaterialId: s.selectedEdgeMaterialId,
      selectedFrontEdgeMaterialId: s.selectedFrontEdgeMaterialId,
      elementConfigs: s.elementConfigs,
      compartmentExtras: s.compartmentExtras,
      doorSelections: s.doorSelections,
      hasBase: s.hasBase,
      baseHeight: s.baseHeight,
      verticalBoundaries: s.verticalBoundaries,
      columnHorizontalBoundaries: s.columnHorizontalBoundaries,
      columnModuleBoundaries: s.columnModuleBoundaries,
      columnTopModuleShelves: s.columnTopModuleShelves,
      doorGroups: s.doorGroups,
      globalHandleId: s.globalHandleId,
      globalHandleFinish: s.globalHandleFinish,
      doorSettingsMode: s.doorSettingsMode,
      selectedAccessories: s.selectedAccessories,
      slidingDoors: s.slidingDoors,
    },
    materials,
    [],
    [],
    accessoryRules,
  );
  store.resetToDefaults();
  return cutList;
}
