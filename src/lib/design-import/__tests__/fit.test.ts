import { describe, expect, it } from "vitest";
import { distributeWidths, fitShelves, groupSections } from "../fit";

const T = 0.018;
const GAP = 0.1;

function clearGaps(ys: number[], floor: number, ceiling: number) {
  const gaps: number[] = [];
  let last = floor;
  ys.forEach((y, i) => {
    gaps.push(y - T / 2 - last);
    last = y + T / 2;
    if (i === ys.length - 1) gaps.push(ceiling - last);
  });
  return gaps;
}

describe("distributeWidths", () => {
  it("follows ratios and sums exactly", () => {
    const w = distributeWidths([1, 1, 1.3], 210, 20, 120);
    expect(w.reduce((s, x) => s + x, 0)).toBe(210);
    expect(w[2]).toBeGreaterThan(w[0]);
  });

  it("clamps a huge section to the max and shares the rest", () => {
    const w = distributeWidths([10, 1], 200, 20, 120);
    expect(w).toEqual([120, 80]);
  });

  it("lifts a sliver up to the minimum", () => {
    const w = distributeWidths([0.01, 1, 1], 200, 20, 120);
    expect(w[0]).toBe(20);
    expect(w.reduce((s, x) => s + x, 0)).toBe(200);
  });

  it("treats bad ratios as equal", () => {
    expect(distributeWidths([Number.NaN, -3, 0], 150, 20, 120)).toEqual([
      50, 50, 50,
    ]);
  });
});

describe("groupSections", () => {
  it("pairs four equal sections into two columns", () => {
    expect(groupSections([1, 1, 1, 1], 2)).toEqual([2, 2]);
  });

  it("keeps a wide section on its own", () => {
    expect(groupSections([3, 1, 1, 1], 2)).toEqual([1, 3]);
  });

  it("returns one per section when there are enough groups", () => {
    expect(groupSections([1, 1], 3)).toEqual([1, 1]);
  });
});

describe("fitShelves", () => {
  it("keeps well-spaced shelves where they are", () => {
    expect(fitShelves([0.5, 1.0], T, 1.982, T, GAP, 14)).toEqual([0.5, 1.0]);
  });

  it("pushes shelves 3cm apart to a 10cm clear gap", () => {
    const ys = fitShelves([0.5, 0.53, 0.56], T, 1.982, T, GAP, 14);
    expect(ys).toHaveLength(3);
    for (const g of clearGaps(ys, T, 1.982))
      expect(g).toBeGreaterThanOrEqual(GAP - 1e-9);
  });

  it("spreads evenly when too many are asked for", () => {
    const wanted = Array.from({ length: 30 }, (_, i) => 0.05 + i * 0.03);
    const ys = fitShelves(wanted, T, 1.982, T, GAP, 14);
    expect(ys.length).toBeLessThanOrEqual(14);
    for (const g of clearGaps(ys, T, 1.982))
      expect(g).toBeGreaterThanOrEqual(GAP - 1e-9);
  });

  it("returns nothing when the opening is too small for any shelf", () => {
    expect(fitShelves([0.1], T, 0.2, T, GAP, 14)).toEqual([]);
  });

  it("drops NaN positions", () => {
    expect(fitShelves([Number.NaN], T, 1.982, T, GAP, 14)).toEqual([]);
  });
});
