/**
 * Builds a planned wardrobe through the same store actions the configurator
 * UI calls, then checks the result. If anything still breaks a rule, parts
 * are stripped (doors, then interiors, then shelves, then everything) until
 * the wardrobe is valid, so an import always leaves a usable design.
 */

import { useShelfStore } from "@/lib/store";
import { DEFAULT_PANEL_THICKNESS_M } from "@/lib/wardrobe-constants";
import { parseDraft } from "./draft";
import {
  type Adjustment,
  type DimensionOverrides,
  planWardrobe,
  type WardrobePlan,
} from "./plan";
import { type Violation, validateWardrobe } from "./validate";

type Store = typeof useShelfStore;

export type ImportStatus = "empty" | "ok" | "adjusted" | "fallback";

export interface ImportResult {
  status: ImportStatus;
  adjustments: Adjustment[];
  /** Always empty unless the final reset itself failed validation. */
  violations: Violation[];
}

const T = DEFAULT_PANEL_THICKNESS_M;

export function applyPlan(plan: WardrobePlan, store: Store = useShelfStore) {
  const st = store.getState();
  st.resetToDefaults();
  st.setWidth(plan.widthCm);
  st.setHeight(plan.heightCm);
  st.setDepth(plan.depthCm);
  st.setHasBase(plan.hasBase);
  st.setBaseHeight(plan.baseHeightCm);

  const seams: number[] = [];
  let x = -plan.widthCm / 200;
  for (const col of plan.columns.slice(0, -1)) {
    x += col.widthCm / 100;
    seams.push(x);
  }
  st.setVerticalBoundaries(seams);

  // Structure first: shelf-count setters wipe the column's interiors.
  plan.columns.forEach((col, c) => {
    if (col.shelves.length > 0) {
      st.setColumnShelfCount(c, col.shelves.length, T);
      st.setColumnHorizontalBoundaries(c, col.shelves);
    }
    if (col.topShelfCount > 0)
      st.setColumnTopModuleShelfCount(c, col.topShelfCount, T);
  });

  // Interiors in the order the panel enforces: dividers, shelves, drawers, rod.
  plan.columns.forEach((col, c) => {
    const letter = String.fromCharCode(65 + c);
    for (const [num, comp] of Object.entries(col.compartments)) {
      const key = `${letter}${num}`;
      if (comp.sections > 1) st.setElementColumns(key, comp.sections);
      comp.rowCounts.forEach((n, s) => {
        if (n > 0) st.setElementRowCount(key, s, n);
      });
      comp.drawerCounts.forEach((n, s) => {
        if (n > 0) st.setElementDrawerCount(key, s, n);
      });
      if (comp.rod) st.toggleCompRod(key);
    }
  });

  if (plan.slidingDoors) {
    st.setSlidingDoors(true);
  } else {
    plan.columns.forEach((col, c) => {
      const letter = String.fromCharCode(65 + c);
      for (const door of col.doors) {
        st.startDoorSelection(`${letter}${door.from}`);
        st.updateDoorSelectionDrag(`${letter}${door.to}`);
        st.endDoorSelection();
        st.setDoorForSelection(door.type);
        st.clearDoorSelection();
      }
    });
  }
}

const STRIP_STEPS: {
  code: string;
  message: string;
  strip: (store: Store) => void;
}[] = [
  {
    code: "fallback.doors",
    message: "Vrata su uklonjena jer nisu mogla da se postave ispravno.",
    strip: (store) =>
      store.setState({
        doorGroups: [],
        doorSelections: {},
        slidingDoors: false,
      }),
  },
  {
    code: "fallback.interiors",
    message:
      "Fioke, pregrade i šipke su uklonjene jer nisu mogle da se postave ispravno.",
    strip: (store) =>
      store.setState({ elementConfigs: {}, compartmentExtras: {} }),
  },
  {
    code: "fallback.shelves",
    message: "Police su uklonjene jer nisu mogle da se postave ispravno.",
    strip: (store) =>
      store.setState({
        columnHorizontalBoundaries: {},
        columnTopModuleShelves: {},
      }),
  },
  {
    code: "fallback.reset",
    message: "Crtež nije mogao da se prenese, prikazan je standardni orman.",
    strip: (store) => store.getState().resetToDefaults(),
  },
];

/**
 * Entry point for an uploaded image's reading: parses anything, plans,
 * builds and verifies. Leaves the store untouched when nothing was recognized.
 */
export function importWardrobeDraft(
  raw: unknown,
  overrides: DimensionOverrides = {},
  store: Store = useShelfStore,
): ImportResult {
  const result = planWardrobe(parseDraft(raw), overrides);
  if (result.status === "empty") {
    return { status: "empty", adjustments: result.adjustments, violations: [] };
  }

  const adjustments = [...result.adjustments];
  let status: ImportStatus = result.status;
  const materials = currentMaterials(store);
  const reset = STRIP_STEPS[STRIP_STEPS.length - 1];
  try {
    applyPlan(result.plan, store);
  } catch {
    reset.strip(store);
    adjustments.push({ code: reset.code, message: reset.message });
    restoreMaterials(store, materials);
    return { status: "fallback", adjustments, violations: safeValidate(store) };
  }

  let violations = safeValidate(store);
  for (const step of STRIP_STEPS) {
    if (violations.length === 0) break;
    step.strip(store);
    adjustments.push({ code: step.code, message: step.message });
    status = "fallback";
    violations = safeValidate(store);
  }
  restoreMaterials(store, materials);
  return { status, adjustments, violations };
}

// A drawing carries no materials, so whatever the customer already picked
// survives the reset that building a new layout starts with.
function currentMaterials(store: Store) {
  const s = store.getState();
  return {
    selectedMaterialId: s.selectedMaterialId,
    selectedFrontMaterialId: s.selectedFrontMaterialId,
    selectedBackMaterialId: s.selectedBackMaterialId,
    selectedEdgeMaterialId: s.selectedEdgeMaterialId,
    selectedFrontEdgeMaterialId: s.selectedFrontEdgeMaterialId,
  };
}

function restoreMaterials(
  store: Store,
  materials: ReturnType<typeof currentMaterials>,
) {
  store.setState(materials);
  // Re-validates the ids against the loaded catalogue, filling any gaps.
  const st = store.getState();
  st.setMaterials(st.materials);
}

function safeValidate(store: Store): Violation[] {
  try {
    return validateWardrobe(store.getState());
  } catch (error) {
    return [{ code: "validator.crash", message: String(error) }];
  }
}
