import { describe, expect, it } from "vitest";

import { computeCompartmentCount } from "../rules/computeCompartmentCount";

describe("computeCompartmentCount", () => {
  it("returns one compartment for a single empty column", () => {
    expect(
      computeCompartmentCount({
        height: 200,
      }),
    ).toBe(1);
  });

  it("counts bottom-module compartments across multiple columns", () => {
    expect(
      computeCompartmentCount({
        height: 200,
        verticalBoundaries: [0],
        columnHorizontalBoundaries: {
          0: [0.5, 1.0],
          1: [0.75],
        },
      }),
    ).toBe(5);
  });

  it("counts top-module compartments when module boundary exists", () => {
    expect(
      computeCompartmentCount({
        height: 250,
        columnHorizontalBoundaries: {
          0: [1.0],
        },
        columnModuleBoundaries: {
          0: 2.0,
        },
        columnTopModuleShelves: {
          0: [2.2],
        },
      }),
    ).toBe(4);
  });

  it("uses referenced columns even without vertical boundaries", () => {
    expect(
      computeCompartmentCount({
        height: 200,
        columnHorizontalBoundaries: {
          2: [0.5],
        },
      }),
    ).toBe(4);
  });
});