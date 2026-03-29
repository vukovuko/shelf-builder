import { describe, expect, it } from "vitest";

import { computeShelfCount } from "../rules/computeShelfCount";

describe("computeShelfCount", () => {
  it("returns 0 when snapshot is missing", () => {
    expect(computeShelfCount(undefined)).toBe(0);
  });

  it("counts bottom module shelves across all columns", () => {
    expect(
      computeShelfCount({
        columnHorizontalBoundaries: {
          0: [0.5, 1.0],
          1: [0.75],
        },
      }),
    ).toBe(3);
  });

  it("counts top module shelves in addition to bottom module shelves", () => {
    expect(
      computeShelfCount({
        height: 250,
        columnHorizontalBoundaries: {
          0: [0.6],
        },
        columnModuleBoundaries: {
          0: 2.0,
          1: 2.0,
        },
        columnTopModuleShelves: {
          0: [2.2, 2.4],
          1: [2.3],
        },
      }),
    ).toBe(4);
  });

  it("ignores malformed shelf collections", () => {
    expect(
      computeShelfCount({
        height: 250,
        columnHorizontalBoundaries: {
          0: [0.6],
          1: null,
          2: undefined,
        },
        columnTopModuleShelves: {
          0: undefined,
          1: [2.3],
        },
      }),
    ).toBe(2);
  });

  it("ignores shelves outside valid bottom and top module bounds", () => {
    expect(
      computeShelfCount({
        height: 250,
        columnHorizontalBoundaries: {
          0: [0.001, 1.0, 2.3],
        },
        columnModuleBoundaries: {
          0: 2.0,
        },
        columnTopModuleShelves: {
          0: [2.001, 2.2, 2.6],
        },
      }),
    ).toBe(2);
  });

  it("ignores top module shelves when module boundary is invalid", () => {
    expect(
      computeShelfCount({
        height: 180,
        columnHorizontalBoundaries: {
          0: [0.5],
        },
        columnModuleBoundaries: {
          0: 1.0,
        },
        columnTopModuleShelves: {
          0: [1.4],
        },
      }),
    ).toBe(1);
  });
});