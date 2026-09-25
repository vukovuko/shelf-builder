import { beforeEach, describe, expect, it } from "vitest";
import { useShelfStore } from "@/lib/store";
import { validateWardrobe } from "../validate";

const state = () => useShelfStore.getState();
const set = (patch: Record<string, unknown>) => useShelfStore.setState(patch);
const violationCodes = () => validateWardrobe(state()).map((v) => v.code);

beforeEach(() => state().resetToDefaults());

describe("validateWardrobe catches what the UI would never allow", () => {
  it("accepts the default wardrobe", () => {
    expect(validateWardrobe(state())).toEqual([]);
  });

  it.each([
    [{ width: 900 }, "width"],
    [{ height: 20 }, "height"],
    [{ depth: Number.NaN }, "depth"],
    [{ hasBase: true, baseHeight: 25 }, "base"],
  ])("dimension %j", (patch, code) => {
    set(patch);
    expect(violationCodes()).toContain(code);
  });

  it("a column wider than 120 cm", () => {
    set({ verticalBoundaries: [0.4] });
    expect(violationCodes()).toContain("columns.width");
  });

  it("too few columns for the width", () => {
    set({ verticalBoundaries: [0], width: 300 });
    expect(violationCodes()).toContain("columns.count");
  });

  it("shelves 3 cm apart", () => {
    set({ columnHorizontalBoundaries: { 0: [0.5, 0.53] } });
    expect(violationCodes()).toContain("shelves.gap");
  });

  it("a drawer in a 180 cm opening", () => {
    set({
      columnHorizontalBoundaries: {},
      elementConfigs: { A1: { columns: 1, rowCounts: [0], drawerCounts: [1] } },
    });
    expect(violationCodes()).toContain("drawers");
  });

  it("ten sections in a 105 cm column", () => {
    set({
      elementConfigs: {
        A1: {
          columns: 10,
          rowCounts: Array(10).fill(0),
          drawerCounts: Array(10).fill(0),
        },
      },
    });
    expect(violationCodes()).toContain("dividers");
  });

  it("20 inner shelves", () => {
    set({
      elementConfigs: {
        A1: { columns: 1, rowCounts: [20], drawerCounts: [0] },
      },
    });
    expect(violationCodes()).toContain("innerShelves");
  });

  it("a rod in a divided compartment", () => {
    set({
      elementConfigs: {
        A1: { columns: 2, rowCounts: [0, 0], drawerCounts: [0, 0] },
      },
      compartmentExtras: { A1: { rod: true } },
    });
    expect(violationCodes()).toContain("extras.divided");
  });

  it("config for a compartment that does not exist", () => {
    set({ elementConfigs: { A9: { columns: 1, rowCounts: [0] } } });
    expect(violationCodes()).toContain("interior.orphan");
  });

  it("a door over external drawers", () => {
    set({
      columnHorizontalBoundaries: { 0: [0.3] },
      elementConfigs: { A1: { columns: 1, rowCounts: [0], drawerCounts: [1] } },
      doorGroups: [
        { id: "d", type: "left", compartments: ["A1", "A2"], column: "A" },
      ],
    });
    expect(violationCodes()).toContain("doors.drawers");
  });

  it("a door too short", () => {
    set({
      height: 210,
      columnModuleBoundaries: { 0: 2.0, 1: 2.0 },
      doorGroups: [
        { id: "d", type: "left", compartments: ["A2"], column: "A" },
      ],
    });
    expect(violationCodes()).toContain("doors.height");
  });

  it("sliding doors on one column", () => {
    set({ width: 100, verticalBoundaries: [], slidingDoors: true });
    expect(violationCodes()).toContain("sliding.columns");
  });
});
