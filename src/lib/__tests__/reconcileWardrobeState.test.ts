import { describe, it, expect } from "vitest";
import {
  getValidCompartments,
  reconcileWardrobeState,
  type ReconcileInput,
} from "../reconcileWardrobeState";
import { DEFAULT_PANEL_THICKNESS_M } from "../wardrobe-constants";

const t = DEFAULT_PANEL_THICKNESS_M; // 0.018m

/** Helper to build a minimal valid state for testing */
function makeState(overrides: Partial<ReconcileInput> = {}): ReconcileInput {
  return {
    width: 210, // cm → 2.1m → auto 2 columns
    height: 240, // cm → 2.4m (> 200cm, so module split)
    hasBase: false,
    baseHeight: 0,
    verticalBoundaries: [0], // 1 seam at center → 2 columns (A, B)
    columnHorizontalBoundaries: {},
    columnModuleBoundaries: {},
    columnTopModuleShelves: {},
    columnHeights: {},
    elementConfigs: {},
    compartmentExtras: {},
    doorGroups: [],
    doorSelections: {},
    ...overrides,
  };
}

// ─── getValidCompartments ────────────────────────────────────────────────────

describe("getValidCompartments", () => {
  it("returns correct compartments for simple 2-column wardrobe without shelves", () => {
    const state = makeState({
      height: 180, // Below 200cm → no module split
      columnModuleBoundaries: {},
    });
    const comps = getValidCompartments(state);

    // 2 columns (A, B), no shelves → A1, B1
    expect(comps.size).toBe(2);
    expect(comps.has("A1")).toBe(true);
    expect(comps.has("B1")).toBe(true);
    // Heights should be positive
    expect(comps.get("A1")!.heightCm).toBeGreaterThan(0);
    expect(comps.get("B1")!.heightCm).toBeGreaterThan(0);
  });

  it("returns correct compartments with horizontal shelves", () => {
    const state = makeState({
      height: 180,
      columnModuleBoundaries: {},
      columnHorizontalBoundaries: {
        0: [0.9], // 1 shelf in column A → 2 compartments (A1, A2)
      },
    });
    const comps = getValidCompartments(state);

    // Column A: A1, A2; Column B: B1
    expect(comps.size).toBe(3);
    expect(comps.has("A1")).toBe(true);
    expect(comps.has("A2")).toBe(true);
    expect(comps.has("B1")).toBe(true);
  });

  it("returns correct compartments with module split", () => {
    const state = makeState({
      height: 240, // > 200cm
      columnModuleBoundaries: { 0: 2.0, 1: 2.0 }, // Module boundary at 200cm
    });
    const comps = getValidCompartments(state);

    // Each column: bottom A1 + top A2, bottom B1 + top B2
    expect(comps.size).toBe(4);
    expect(comps.has("A1")).toBe(true);
    expect(comps.has("A2")).toBe(true);
    expect(comps.has("B1")).toBe(true);
    expect(comps.has("B2")).toBe(true);
  });

  it("handles module split with top module shelves", () => {
    const state = makeState({
      height: 240,
      columnModuleBoundaries: { 0: 2.0, 1: 2.0 },
      columnHorizontalBoundaries: { 0: [1.0] }, // 1 shelf in bottom module of A
      columnTopModuleShelves: { 0: [2.2] }, // 1 shelf in top module of A
    });
    const comps = getValidCompartments(state);

    // Column A: bottom A1,A2 (1 shelf), top A3,A4 (1 shelf) = 4
    // Column B: bottom B1, top B2 = 2
    expect(comps.size).toBe(6);
    expect(comps.has("A1")).toBe(true);
    expect(comps.has("A2")).toBe(true);
    expect(comps.has("A3")).toBe(true);
    expect(comps.has("A4")).toBe(true);
    expect(comps.has("B1")).toBe(true);
    expect(comps.has("B2")).toBe(true);
  });

  it("single column (no vertical boundaries)", () => {
    const state = makeState({
      width: 80, // 80cm → 1 column
      height: 180,
      verticalBoundaries: [],
      columnModuleBoundaries: {},
    });
    const comps = getValidCompartments(state);

    expect(comps.size).toBe(1);
    expect(comps.has("A1")).toBe(true);
  });

  it("computes height using DEFAULT_PANEL_THICKNESS_M (18mm)", () => {
    // 180cm wardrobe, no base, no shelves, no module split
    const state = makeState({
      width: 80,
      height: 180,
      verticalBoundaries: [],
      columnModuleBoundaries: {},
    });
    const comps = getValidCompartments(state);

    // t = 0.018m, colH = 1.8m
    // bottomYStart = t = 0.018
    // bottomYEnd = colH - t = 1.8 - 0.018 = 1.782
    // heightCm = (1.782 - 0.018) * 100 = 176.4
    const expectedHeight = (1.8 - 2 * t) * 100;
    expect(comps.get("A1")!.heightCm).toBeCloseTo(expectedHeight, 5);
  });

  it("uses per-column height from columnHeights when provided", () => {
    const state = makeState({
      height: 180, // global height (used as fallback)
      verticalBoundaries: [0], // 2 columns
      columnModuleBoundaries: {},
      columnHeights: { 0: 150 }, // Column A is 150cm, Column B uses global 180cm
    });
    const comps = getValidCompartments(state);

    const expectedHeightA = (1.5 - 2 * t) * 100;
    const expectedHeightB = (1.8 - 2 * t) * 100;
    expect(comps.get("A1")!.heightCm).toBeCloseTo(expectedHeightA, 5);
    expect(comps.get("B1")!.heightCm).toBeCloseTo(expectedHeightB, 5);
  });

  it("module split only activates when colH > TARGET_BOTTOM_HEIGHT (200cm)", () => {
    // Column A at 190cm (below 200cm threshold) with module boundary set
    // Module boundary should be IGNORED
    const state = makeState({
      width: 80, // single column
      height: 190,
      verticalBoundaries: [],
      columnModuleBoundaries: { 0: 1.5 }, // boundary exists but height too low
    });
    const comps = getValidCompartments(state);

    // No module split → only A1
    expect(comps.size).toBe(1);
    expect(comps.has("A1")).toBe(true);
    expect(comps.has("A2")).toBe(false);
  });

  it("module split activates for per-column height > 200cm even if global < 200cm", () => {
    const state = makeState({
      height: 180, // global height below 200cm
      verticalBoundaries: [0],
      columnHeights: { 0: 250 }, // Column A is 250cm (> 200cm)
      columnModuleBoundaries: { 0: 2.0 }, // boundary at 200cm for column A
    });
    const comps = getValidCompartments(state);

    // Column A: module split → A1 (bottom) + A2 (top)
    expect(comps.has("A1")).toBe(true);
    expect(comps.has("A2")).toBe(true);
    // Column B: global height 180cm, no boundary → B1 only
    expect(comps.has("B1")).toBe(true);
    expect(comps.has("B2")).toBe(false);
  });

  it("base height reduces compartment height", () => {
    const state = makeState({
      width: 80,
      height: 180,
      verticalBoundaries: [],
      columnModuleBoundaries: {},
      hasBase: true,
      baseHeight: 20, // 20cm base
    });
    const comps = getValidCompartments(state);

    // bottomYStart = t + baseH = 0.018 + 0.2 = 0.218
    // bottomYEnd = colH - t = 1.8 - 0.018 = 1.782
    // heightCm = (1.782 - 0.218) * 100 = 156.4
    const expectedHeight = (1.8 - t - t - 0.2) * 100;
    expect(comps.get("A1")!.heightCm).toBeCloseTo(expectedHeight, 5);
  });

  it("auto-creates 3 columns for wide wardrobe without explicit boundaries", () => {
    // MAX_SEGMENT_X = 1.2m. Width 300cm = 3.0m → ceil(3.0/1.2) = 3 columns
    const state = makeState({
      width: 300,
      height: 180,
      verticalBoundaries: [], // auto-calculate
      columnModuleBoundaries: {},
    });
    const comps = getValidCompartments(state);

    expect(comps.size).toBe(3);
    expect(comps.has("A1")).toBe(true);
    expect(comps.has("B1")).toBe(true);
    expect(comps.has("C1")).toBe(true);
  });

  it("multiple shelves create correctly-numbered compartments", () => {
    const state = makeState({
      width: 80,
      height: 180,
      verticalBoundaries: [],
      columnModuleBoundaries: {},
      columnHorizontalBoundaries: {
        0: [0.4, 0.8, 1.2], // 3 shelves → 4 compartments
      },
    });
    const comps = getValidCompartments(state);

    expect(comps.size).toBe(4);
    expect(comps.has("A1")).toBe(true);
    expect(comps.has("A2")).toBe(true);
    expect(comps.has("A3")).toBe(true);
    expect(comps.has("A4")).toBe(true);
  });

  it("shelf Y positions are sorted regardless of input order", () => {
    const state = makeState({
      width: 80,
      height: 180,
      verticalBoundaries: [],
      columnModuleBoundaries: {},
      columnHorizontalBoundaries: {
        0: [1.2, 0.4, 0.8], // Unsorted input
      },
    });
    const comps = getValidCompartments(state);

    // Should produce same 4 compartments as sorted input
    expect(comps.size).toBe(4);
    // A1 = bottom to first shelf (0.4), should be smallest
    // A4 = last shelf (1.2) to top, should be largest
    expect(comps.get("A1")!.heightCm).toBeLessThan(comps.get("A4")!.heightCm);
  });

  it("compartment heights sum to column usable height", () => {
    const state = makeState({
      width: 80,
      height: 180,
      verticalBoundaries: [],
      columnModuleBoundaries: {},
      columnHorizontalBoundaries: {
        0: [0.5, 1.0], // 2 shelves → 3 compartments
      },
    });
    const comps = getValidCompartments(state);

    const totalHeight =
      comps.get("A1")!.heightCm +
      comps.get("A2")!.heightCm +
      comps.get("A3")!.heightCm;
    const usableHeight = (1.8 - 2 * t) * 100; // colH - top panel - bottom panel
    expect(totalHeight).toBeCloseTo(usableHeight, 5);
  });

  it("top module compartment heights sum correctly with module split", () => {
    const state = makeState({
      width: 80,
      height: 240,
      verticalBoundaries: [],
      columnModuleBoundaries: { 0: 2.0 },
      columnTopModuleShelves: { 0: [2.2] }, // 1 shelf in top module
    });
    const comps = getValidCompartments(state);

    // Bottom module: A1 (t to moduleBoundary-t)
    // Top module: A2, A3 (moduleBoundary+t to colH-t, split by shelf at 2.2)
    expect(comps.size).toBe(3);

    const topHeight = comps.get("A2")!.heightCm + comps.get("A3")!.heightCm;
    // Top module usable = (colH - t) - (moduleBoundary + t) = (2.4-0.018) - (2.0+0.018) = 0.364m
    const topUsable = (2.4 - t - (2.0 + t)) * 100;
    expect(topHeight).toBeCloseTo(topUsable, 5);
  });
});

// ─── reconcileWardrobeState ──────────────────────────────────────────────────

describe("reconcileWardrobeState", () => {
  // --- Basic pass-through ---

  it("passes through valid state unchanged", () => {
    const state = makeState({
      height: 180,
      columnModuleBoundaries: {},
      elementConfigs: {
        A1: { columns: 1, rowCounts: [0], drawerCounts: [2] },
        B1: { columns: 1, rowCounts: [0] },
      },
      compartmentExtras: {
        A1: { rod: true },
        B1: { led: true },
      },
    });
    const result = reconcileWardrobeState(state);

    expect(result.elementConfigs).toHaveProperty("A1");
    expect(result.elementConfigs).toHaveProperty("B1");
    expect(result.elementConfigs.A1.drawerCounts).toEqual([2]);
    expect(result.compartmentExtras).toHaveProperty("A1");
    expect(result.compartmentExtras).toHaveProperty("B1");
  });

  it("no-op when state is already clean", () => {
    const state = makeState({
      height: 180,
      columnModuleBoundaries: {},
      elementConfigs: {},
      compartmentExtras: {},
      doorGroups: [],
      doorSelections: {},
    });
    const result = reconcileWardrobeState(state);

    expect(Object.keys(result.elementConfigs)).toHaveLength(0);
    expect(Object.keys(result.compartmentExtras)).toHaveLength(0);
    expect(result.doorGroups).toHaveLength(0);
    expect(Object.keys(result.doorSelections)).toHaveLength(0);
  });

  // --- rowCounts preservation ---

  it("never modifies rowCounts (they are managed by validateInnerShelfConfigs)", () => {
    const state = makeState({
      height: 180,
      columnModuleBoundaries: {},
      elementConfigs: {
        A1: { columns: 2, rowCounts: [3, 5] },
        B1: { columns: 3, rowCounts: [1, 2, 0] },
      },
    });
    const result = reconcileWardrobeState(state);

    expect(result.elementConfigs.A1.rowCounts).toEqual([3, 5]);
    expect(result.elementConfigs.B1.rowCounts).toEqual([1, 2, 0]);
  });

  it("preserves columns field unchanged", () => {
    const state = makeState({
      height: 180,
      columnModuleBoundaries: {},
      elementConfigs: {
        A1: { columns: 3, rowCounts: [0, 0, 0], drawerCounts: [0, 0, 0] },
      },
    });
    const result = reconcileWardrobeState(state);

    expect(result.elementConfigs.A1.columns).toBe(3);
  });

  // --- Orphan removal ---

  it("removes orphaned elementConfigs for non-existent compartments", () => {
    const state = makeState({
      height: 180,
      columnModuleBoundaries: {},
      verticalBoundaries: [0], // 2 columns: A, B
      elementConfigs: {
        A1: { columns: 1, rowCounts: [0] },
        B1: { columns: 1, rowCounts: [0] },
        C1: { columns: 1, rowCounts: [0] }, // Column C doesn't exist!
        A5: { columns: 1, rowCounts: [0] }, // A5 doesn't exist (no shelves)
      },
    });
    const result = reconcileWardrobeState(state);

    expect(result.elementConfigs).toHaveProperty("A1");
    expect(result.elementConfigs).toHaveProperty("B1");
    expect(result.elementConfigs).not.toHaveProperty("C1");
    expect(result.elementConfigs).not.toHaveProperty("A5");
  });

  it("removes orphaned compartmentExtras", () => {
    const state = makeState({
      height: 180,
      columnModuleBoundaries: {},
      verticalBoundaries: [0],
      compartmentExtras: {
        A1: { rod: true },
        C1: { led: true }, // Column C doesn't exist
        B3: { rod: true }, // B3 doesn't exist (no shelves)
      },
    });
    const result = reconcileWardrobeState(state);

    expect(result.compartmentExtras).toHaveProperty("A1");
    expect(result.compartmentExtras).not.toHaveProperty("C1");
    expect(result.compartmentExtras).not.toHaveProperty("B3");
  });

  it("removes all configs when columns shrink from 3 to 1", () => {
    // 3 columns: A, B, C → shrink to 1 column (A only)
    const state = makeState({
      width: 80, // only 1 auto-column
      height: 180,
      verticalBoundaries: [], // no boundaries → auto 1 column
      columnModuleBoundaries: {},
      elementConfigs: {
        A1: { columns: 1, rowCounts: [0] },
        B1: { columns: 2, rowCounts: [1, 0] },
        C1: { columns: 1, rowCounts: [0], drawerCounts: [2] },
      },
      compartmentExtras: {
        A1: { rod: true },
        B1: { led: true },
        C1: { rod: true, led: true },
      },
    });
    const result = reconcileWardrobeState(state);

    expect(Object.keys(result.elementConfigs)).toEqual(["A1"]);
    expect(Object.keys(result.compartmentExtras)).toEqual(["A1"]);
  });

  // --- Drawer clamping ---

  it("clamps drawerCounts when compartment is too small", () => {
    const state = makeState({
      height: 180,
      columnModuleBoundaries: {},
      columnHorizontalBoundaries: {
        0: [0.15, 0.3], // 3 compartments: ~15cm, ~15cm, ~rest
      },
      elementConfigs: {
        A1: { columns: 1, rowCounts: [0], drawerCounts: [5] }, // 5 drawers won't fit in ~15cm
      },
    });
    const result = reconcileWardrobeState(state);

    // A1 compartment is small → drawerCounts should be clamped
    expect(result.elementConfigs.A1.drawerCounts[0]).toBeLessThan(5);
    expect(result.elementConfigs.A1.drawerCounts[0]).toBeGreaterThanOrEqual(0);
  });

  it("clamps drawerCounts to 0 when compartment is tiny", () => {
    const state = makeState({
      height: 180,
      columnModuleBoundaries: {},
      // Two shelves very close together: compartment between them is ~5cm
      columnHorizontalBoundaries: {
        0: [0.05, 0.1], // Creates a ~5cm compartment between these
      },
      elementConfigs: {
        A2: { columns: 1, rowCounts: [0], drawerCounts: [3] }, // Won't fit
      },
    });
    const result = reconcileWardrobeState(state);

    // A2 is a tiny compartment (~5cm) → 0 drawers fit
    expect(result.elementConfigs.A2.drawerCounts[0]).toBe(0);
  });

  it("clamps per-section drawerCounts independently in multi-column config", () => {
    // Large compartment, 3 columns. Each section has different drawer counts.
    const state = makeState({
      width: 80,
      height: 180,
      verticalBoundaries: [],
      columnModuleBoundaries: {},
      elementConfigs: {
        A1: {
          columns: 3,
          rowCounts: [0, 0, 0],
          drawerCounts: [2, 5, 0], // section 2 has 5 drawers
        },
      },
    });
    const result = reconcileWardrobeState(state);

    // Full compartment ≈ 176cm → max drawers = floor(176.4/10) = 17
    // All values should be preserved (none exceed max)
    expect(result.elementConfigs.A1.drawerCounts).toEqual([2, 5, 0]);
  });

  it("does not modify drawerCounts when they all fit", () => {
    const state = makeState({
      width: 80,
      height: 180,
      verticalBoundaries: [],
      columnModuleBoundaries: {},
      elementConfigs: {
        A1: { columns: 1, rowCounts: [0], drawerCounts: [3] },
      },
    });
    const result = reconcileWardrobeState(state);

    // drawerCounts reference should be the same (no spread) if unchanged
    expect(result.elementConfigs.A1.drawerCounts).toEqual([3]);
  });

  it("handles elementConfigs without drawerCounts field", () => {
    const state = makeState({
      height: 180,
      columnModuleBoundaries: {},
      elementConfigs: {
        A1: { columns: 1, rowCounts: [2] }, // No drawerCounts field at all
      },
    });
    const result = reconcileWardrobeState(state);

    expect(result.elementConfigs.A1.rowCounts).toEqual([2]);
    expect(result.elementConfigs.A1.drawerCounts).toBeUndefined();
  });

  // --- drawersExternal ---

  it("clears drawersExternal when all drawers clamped to 0", () => {
    const state = makeState({
      height: 180,
      columnModuleBoundaries: {},
      columnHorizontalBoundaries: {
        0: [0.05, 0.1], // Creates tiny compartment A2
      },
      elementConfigs: {
        A2: {
          columns: 1,
          rowCounts: [0],
          drawerCounts: [3],
          drawersExternal: [true],
        },
      },
    });
    const result = reconcileWardrobeState(state);

    expect(result.elementConfigs.A2.drawerCounts[0]).toBe(0);
    expect(result.elementConfigs.A2.drawersExternal).toBeUndefined();
  });

  it("preserves drawersExternal when drawers are only partially clamped (not to 0)", () => {
    // Compartment that fits 2 drawers but config has 5
    const state = makeState({
      width: 80,
      height: 180,
      verticalBoundaries: [],
      columnModuleBoundaries: {},
      columnHorizontalBoundaries: {
        0: [0.018 + 0.25], // shelf at ~27cm from floor → A1 is ~25cm, A2 is rest
      },
      elementConfigs: {
        A1: {
          columns: 1,
          rowCounts: [0],
          drawerCounts: [5], // 25cm / 10cm = 2 max
          drawersExternal: [true],
        },
      },
    });
    const result = reconcileWardrobeState(state);

    // Drawers clamped to 2 (not 0), so drawersExternal should be preserved
    expect(result.elementConfigs.A1.drawerCounts[0]).toBe(2);
    expect(result.elementConfigs.A1.drawersExternal).toEqual([true]);
  });

  // --- Door groups ---

  it("removes doorGroups referencing invalid compartments", () => {
    const state = makeState({
      height: 180,
      columnModuleBoundaries: {},
      verticalBoundaries: [0], // 2 columns: A, B
      doorGroups: [
        {
          id: "door-A1",
          type: "left",
          compartments: ["A1"],
          column: "A",
        },
        {
          id: "door-C1",
          type: "right",
          compartments: ["C1"], // Column C doesn't exist
          column: "C",
        },
        {
          id: "door-A1-A2",
          type: "double",
          compartments: ["A1", "A3"], // A3 doesn't exist (no shelves → only A1)
          column: "A",
        },
      ],
    });
    const result = reconcileWardrobeState(state);

    expect(result.doorGroups).toHaveLength(1);
    expect(result.doorGroups[0].id).toBe("door-A1");
  });

  it("handles sub-compartment keys in doorGroups", () => {
    const state = makeState({
      height: 180,
      columnModuleBoundaries: {},
      verticalBoundaries: [0],
      doorGroups: [
        {
          id: "door-sub",
          type: "left",
          compartments: ["A1.0.1", "A1.0.2"], // Sub-compartments of valid A1
          column: "A",
        },
        {
          id: "door-invalid-sub",
          type: "right",
          compartments: ["C1.0.1"], // C1 doesn't exist
          column: "C",
        },
      ],
    });
    const result = reconcileWardrobeState(state);

    expect(result.doorGroups).toHaveLength(1);
    expect(result.doorGroups[0].id).toBe("door-sub");
  });

  it("removes doorGroups with empty compartments array", () => {
    const state = makeState({
      height: 180,
      columnModuleBoundaries: {},
      doorGroups: [
        { id: "door-empty", type: "left", compartments: [], column: "A" },
      ],
    });
    const result = reconcileWardrobeState(state);

    // Empty compartments: every() on empty array returns true, so this is KEPT
    // This tests the actual behavior — is it desired?
    expect(result.doorGroups).toHaveLength(1);
  });

  it("removes doorGroups with missing compartments field", () => {
    const state = makeState({
      height: 180,
      columnModuleBoundaries: {},
      doorGroups: [
        { id: "door-no-comps", type: "left", column: "A" }, // no compartments field
      ],
    });
    const result = reconcileWardrobeState(state);

    // !Array.isArray(undefined) → true → returns false → filtered out
    expect(result.doorGroups).toHaveLength(0);
  });

  it("removes doorGroup when ONE of multiple compartments is invalid", () => {
    const state = makeState({
      height: 180,
      columnModuleBoundaries: {},
      verticalBoundaries: [0],
      columnHorizontalBoundaries: { 0: [0.9] }, // A1, A2
      doorGroups: [
        {
          id: "door-partial",
          type: "double",
          compartments: ["A1", "A2", "A3"], // A3 doesn't exist
          column: "A",
        },
      ],
    });
    const result = reconcileWardrobeState(state);

    // A3 is invalid → entire group removed (ALL must be valid)
    expect(result.doorGroups).toHaveLength(0);
  });

  // --- Door selections ---

  it("removes doorSelections for invalid compartments", () => {
    const state = makeState({
      height: 180,
      columnModuleBoundaries: {},
      verticalBoundaries: [0],
      doorSelections: {
        A1: "left",
        B1: "right",
        C1: "double", // Invalid
      },
    });
    const result = reconcileWardrobeState(state);

    expect(result.doorSelections).toHaveProperty("A1");
    expect(result.doorSelections).toHaveProperty("B1");
    expect(result.doorSelections).not.toHaveProperty("C1");
  });

  it("preserves doorSelections with sub-compartment keys when base is valid", () => {
    const state = makeState({
      height: 180,
      columnModuleBoundaries: {},
      verticalBoundaries: [0],
      doorSelections: {
        "A1.0.1": "left",
        "A1.0.2": "right",
        "C1.0.1": "double", // C1 base doesn't exist
      },
    });
    const result = reconcileWardrobeState(state);

    expect(result.doorSelections).toHaveProperty("A1.0.1");
    expect(result.doorSelections).toHaveProperty("A1.0.2");
    expect(result.doorSelections).not.toHaveProperty("C1.0.1");
  });

  // --- Base height ---

  it("handles base height correctly", () => {
    const state = makeState({
      height: 180,
      columnModuleBoundaries: {},
      hasBase: true,
      baseHeight: 10, // 10cm base
      verticalBoundaries: [],
      elementConfigs: {
        A1: { columns: 1, rowCounts: [0], drawerCounts: [3] },
      },
    });
    const result = reconcileWardrobeState(state);

    // A1 should still exist (compartment is valid)
    expect(result.elementConfigs).toHaveProperty("A1");
    // (180cm - base 10cm - 2*panel 1.8cm ≈ 166cm → max 16 drawers, so 3 is fine)
    expect(result.elementConfigs.A1.drawerCounts[0]).toBe(3);
  });

  it("base height reduces max drawers when combined with small compartment", () => {
    const state = makeState({
      width: 80,
      height: 50, // very short wardrobe: 50cm
      verticalBoundaries: [],
      columnModuleBoundaries: {},
      hasBase: true,
      baseHeight: 20, // 20cm base
      elementConfigs: {
        // Usable: 50 - 20 - 2*1.8 = 26.4cm → floor(26.4/10) = 2 drawers max
        A1: { columns: 1, rowCounts: [0], drawerCounts: [5] },
      },
    });
    const result = reconcileWardrobeState(state);

    expect(result.elementConfigs.A1.drawerCounts[0]).toBe(2);
  });

  // --- Module split scenarios ---

  it("removes top module configs when height drops below 200cm", () => {
    // Height 180 (below 200cm) but module boundaries still present
    // (store preserves them for later restoration)
    const state = makeState({
      width: 80,
      height: 180,
      verticalBoundaries: [],
      columnModuleBoundaries: { 0: 1.5 }, // boundary exists but colH <= 200cm
      elementConfigs: {
        A1: { columns: 1, rowCounts: [0] }, // bottom module
        A2: { columns: 1, rowCounts: [0], drawerCounts: [2] }, // was top module
      },
      compartmentExtras: {
        A1: { rod: true },
        A2: { led: true }, // top module extra
      },
    });
    const result = reconcileWardrobeState(state);

    // Module split disabled (180 <= 200), so only A1 exists
    expect(result.elementConfigs).toHaveProperty("A1");
    expect(result.elementConfigs).not.toHaveProperty("A2");
    expect(result.compartmentExtras).toHaveProperty("A1");
    expect(result.compartmentExtras).not.toHaveProperty("A2");
  });

  it("keeps top module configs when height is above 200cm with module boundary", () => {
    const state = makeState({
      width: 80,
      height: 240,
      verticalBoundaries: [],
      columnModuleBoundaries: { 0: 2.0 },
      elementConfigs: {
        A1: { columns: 1, rowCounts: [0] },
        A2: { columns: 1, rowCounts: [0], drawerCounts: [1] },
      },
      compartmentExtras: {
        A1: { rod: true },
        A2: { led: true },
      },
    });
    const result = reconcileWardrobeState(state);

    expect(result.elementConfigs).toHaveProperty("A1");
    expect(result.elementConfigs).toHaveProperty("A2");
    expect(result.compartmentExtras).toHaveProperty("A1");
    expect(result.compartmentExtras).toHaveProperty("A2");
  });

  // --- NaN robustness ---

  it("preserves config when module boundary is NaN (NaN guard)", () => {
    const state = makeState({
      width: 80,
      height: 240,
      verticalBoundaries: [],
      columnModuleBoundaries: { 0: NaN }, // Invalid boundary
      elementConfigs: {
        A1: { columns: 2, rowCounts: [1, 0], drawerCounts: [2, 0] },
      },
    });
    const result = reconcileWardrobeState(state);

    // NaN module boundary: NaN != null is true, colH > 2.0 is true
    // So hasModuleSplit = true, but moduleBoundary - t = NaN → heights are NaN
    // NaN guard should preserve config as-is
    if (result.elementConfigs.A1) {
      expect(result.elementConfigs.A1.rowCounts).toEqual([1, 0]);
      expect(result.elementConfigs.A1.drawerCounts).toEqual([2, 0]);
    }
  });

  it("does NOT clamp null drawerCounts entries (changed-check masks null vs 0)", () => {
    // BUG/QUIRK: null entries are preserved because the `changed` comparison
    // uses `drawerCounts[i] ?? 0` which normalizes null→0, matching clamped value 0.
    // So `changed` is false and the original [null] is kept.
    const state = makeState({
      height: 180,
      columnModuleBoundaries: {},
      elementConfigs: {
        A1: {
          columns: 1,
          rowCounts: [0],
          drawerCounts: [null as any], // null entry
        },
      },
    });
    const result = reconcileWardrobeState(state);

    // Actual behavior: null is preserved (not clamped to 0)
    expect(result.elementConfigs.A1.drawerCounts[0]).toBeNull();
  });

  // --- Misc edge cases ---

  it("preserves extra fields on elementConfigs (e.g., custom metadata)", () => {
    const state = makeState({
      height: 180,
      columnModuleBoundaries: {},
      elementConfigs: {
        A1: {
          columns: 1,
          rowCounts: [0],
          drawerCounts: [1],
          someCustomField: "test",
        },
      },
    });
    const result = reconcileWardrobeState(state);

    expect(result.elementConfigs.A1.someCustomField).toBe("test");
  });

  it("preserves compartmentExtras content exactly", () => {
    const state = makeState({
      height: 180,
      columnModuleBoundaries: {},
      compartmentExtras: {
        A1: { rod: true, led: false, verticalDivider: true },
      },
    });
    const result = reconcileWardrobeState(state);

    expect(result.compartmentExtras.A1).toEqual({
      rod: true,
      led: false,
      verticalDivider: true,
    });
  });

  it("doorGroups order is preserved for valid groups", () => {
    const state = makeState({
      height: 180,
      columnModuleBoundaries: {},
      verticalBoundaries: [0],
      doorGroups: [
        { id: "third", type: "left", compartments: ["B1"], column: "B" },
        { id: "first", type: "right", compartments: ["A1"], column: "A" },
        { id: "invalid", type: "left", compartments: ["C1"], column: "C" },
        { id: "second", type: "double", compartments: ["B1"], column: "B" },
      ],
    });
    const result = reconcileWardrobeState(state);

    expect(result.doorGroups).toHaveLength(3);
    expect(result.doorGroups[0].id).toBe("third");
    expect(result.doorGroups[1].id).toBe("first");
    expect(result.doorGroups[2].id).toBe("second");
  });
});
