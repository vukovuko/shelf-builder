/**
 * Reconciles wardrobe state after structural changes (height, width, seams, etc.).
 *
 * When dimensions change, per-compartment data (drawers, doors, rods, LEDs) can
 * become stale — e.g., drawers set in a compartment that has since shrunk.
 * This function computes the valid compartment map from current geometry and
 * removes/clamps all stale configuration.
 *
 * Called inline at the end of structural setters in store.ts.
 */

import { buildBlocksX } from "./wardrobe-utils";
import {
  TARGET_BOTTOM_HEIGHT,
  DEFAULT_PANEL_THICKNESS_M,
} from "./wardrobe-constants";

// Minimal state shape needed for reconciliation
export interface ReconcileInput {
  width: number; // cm
  height: number; // cm
  hasBase: boolean;
  baseHeight: number; // cm
  verticalBoundaries: number[];
  columnHorizontalBoundaries: Record<number, number[]>;
  columnModuleBoundaries: Record<number, number | null>;
  columnTopModuleShelves: Record<number, number[]>;
  columnHeights: Record<number, number>;
  elementConfigs: Record<string, any>;
  compartmentExtras: Record<string, any>;
  doorGroups: any[];
  doorSelections: Record<string, string>;
}

export interface ReconcileOutput {
  elementConfigs: Record<string, any>;
  compartmentExtras: Record<string, any>;
  doorGroups: any[];
  doorSelections: Record<string, string>;
}

const MIN_DRAWER_HEIGHT_CM = 10; // Minimum compartment height per drawer

/**
 * Compute the set of valid compartment keys and their heights from current geometry.
 * Returns a Map of compKey (e.g., "A1") → { heightCm }.
 */
export function getValidCompartments(
  state: ReconcileInput,
): Map<string, { heightCm: number }> {
  const w = state.width / 100; // meters
  const t = DEFAULT_PANEL_THICKNESS_M; // meters (always use constant, not state.panelThickness)
  const baseH = state.hasBase ? state.baseHeight / 100 : 0; // meters

  const columns = buildBlocksX(
    w,
    state.verticalBoundaries.length > 0 ? state.verticalBoundaries : undefined,
  );

  const result = new Map<string, { heightCm: number }>();

  for (let colIdx = 0; colIdx < columns.length; colIdx++) {
    const colLetter = String.fromCharCode(65 + colIdx);
    const colH = (state.columnHeights[colIdx] ?? state.height) / 100; // meters

    // Check if this column has an active module split
    const moduleBoundary = state.columnModuleBoundaries[colIdx];
    const hasModuleSplit =
      moduleBoundary != null && colH > TARGET_BOTTOM_HEIGHT;

    // Bottom module shelf Y positions (in meters from floor)
    const shelves = (state.columnHorizontalBoundaries[colIdx] || [])
      .slice()
      .sort((a, b) => a - b);
    const bottomYStart = t + baseH;
    const bottomYEnd = hasModuleSplit ? moduleBoundary - t : colH - t;

    const bottomAllYs = [bottomYStart, ...shelves, bottomYEnd];
    const bottomCompCount = shelves.length + 1;

    for (let i = 0; i < bottomAllYs.length - 1; i++) {
      const compKey = `${colLetter}${i + 1}`;
      const heightCm = (bottomAllYs[i + 1] - bottomAllYs[i]) * 100;
      result.set(compKey, { heightCm });
    }

    // Top module compartments (only if module split is active)
    if (hasModuleSplit) {
      const topShelves = (state.columnTopModuleShelves[colIdx] || [])
        .slice()
        .sort((a, b) => a - b);
      const topYStart = moduleBoundary + t;
      const topYEnd = colH - t;

      const topAllYs = [topYStart, ...topShelves, topYEnd];

      for (let i = 0; i < topAllYs.length - 1; i++) {
        const compKey = `${colLetter}${bottomCompCount + i + 1}`;
        const heightCm = (topAllYs[i + 1] - topAllYs[i]) * 100;
        result.set(compKey, { heightCm });
      }
    }
  }

  return result;
}

/**
 * Reconcile all per-compartment state against current geometry.
 * Removes orphaned entries and clamps values that no longer fit.
 */
export function reconcileWardrobeState(state: ReconcileInput): ReconcileOutput {
  const validComps = getValidCompartments(state);

  // 1. Clean elementConfigs: delete orphaned keys, clamp drawerCounts
  const newElementConfigs: Record<string, any> = {};
  for (const [key, cfg] of Object.entries(state.elementConfigs)) {
    const comp = validComps.get(key);
    if (!comp) continue; // Orphaned compartment — skip

    const compH = comp.heightCm;
    // Guard against NaN — if height computation failed, skip clamping
    if (isNaN(compH)) {
      newElementConfigs[key] = cfg;
      continue;
    }
    const maxDrawers = Math.max(0, Math.floor(compH / MIN_DRAWER_HEIGHT_CM));

    let drawerCounts = cfg.drawerCounts;
    let drawersExternal = cfg.drawersExternal;

    if (Array.isArray(drawerCounts)) {
      const clamped = drawerCounts.map((c: number) =>
        Math.min(Math.max(0, c ?? 0), maxDrawers),
      );
      // Only update if something changed
      const changed = clamped.some(
        (v: number, i: number) => v !== (drawerCounts[i] ?? 0),
      );
      if (changed) {
        drawerCounts = clamped;
        // If all drawers clamped to 0, also clear drawersExternal
        if (clamped.every((c: number) => c === 0)) {
          drawersExternal = undefined;
        }
      }
    }

    newElementConfigs[key] = {
      ...cfg,
      ...(drawerCounts !== cfg.drawerCounts && { drawerCounts }),
      ...(drawersExternal !== cfg.drawersExternal && {
        drawersExternal,
      }),
    };
  }

  // 2. Clean compartmentExtras: delete orphaned keys
  const newCompartmentExtras: Record<string, any> = {};
  for (const [key, extras] of Object.entries(state.compartmentExtras)) {
    if (validComps.has(key)) {
      newCompartmentExtras[key] = extras;
    }
  }

  // 3. Clean doorGroups: remove groups referencing invalid compartments
  const newDoorGroups = state.doorGroups.filter((group: any) => {
    if (!Array.isArray(group.compartments)) return false;
    return group.compartments.every((compRef: string) => {
      // compRef can be "A1" or "A1.0.2" (sub-compartment)
      const match = compRef.match(/^([A-Z]+\d+)/);
      const baseKey = match ? match[1] : compRef;
      return validComps.has(baseKey);
    });
  });

  // 4. Clean doorSelections: remove entries for invalid compartments
  const newDoorSelections: Record<string, string> = {};
  for (const [key, sel] of Object.entries(state.doorSelections)) {
    const match = key.match(/^([A-Z]+\d+)/);
    const baseKey = match ? match[1] : key;
    if (validComps.has(baseKey)) {
      newDoorSelections[key] = sel;
    }
  }

  return {
    elementConfigs: newElementConfigs,
    compartmentExtras: newCompartmentExtras,
    doorGroups: newDoorGroups,
    doorSelections: newDoorSelections,
  };
}
