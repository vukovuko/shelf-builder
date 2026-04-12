import { describe, expect, it } from "vitest";
import {
  getDefaultSectionShelfRatios,
  getSectionShelfDragBounds,
  getSectionShelfPositions,
  getSectionSpaceBounds,
} from "../section-shelf-layout";

describe("section shelf layout", () => {
  it("creates evenly distributed default ratios", () => {
    expect(getDefaultSectionShelfRatios(3)).toEqual([0.25, 0.5, 0.75]);
  });

  it("uses stored shelf ratios for section shelf positions", () => {
    const shelfPositions = getSectionShelfPositions({
      start: 1,
      size: 2,
      shelfCount: 2,
      sectionShelfRatios: [[0.2, 0.8]],
      sectionIndex: 0,
    });

    expect(shelfPositions).toEqual([1.4, 2.6]);
  });

  it("computes space bounds around shelf thickness", () => {
    const { spaces } = getSectionSpaceBounds({
      start: 0,
      size: 1,
      shelfCount: 1,
      sectionShelfRatios: [[0.5]],
      sectionIndex: 0,
      panelThickness: 0.02,
    });

    expect(spaces).toEqual([
      { bottom: 0, top: 0.49, center: 0.245, size: 0.49 },
      { bottom: 0.51, top: 1, center: 0.755, size: 0.49 },
    ]);
  });

  it("computes drag bounds between neighboring shelves", () => {
    const bounds = getSectionShelfDragBounds({
      start: 0,
      size: 1,
      shelfCount: 2,
      sectionShelfRatios: [[0.3, 0.7]],
      sectionIndex: 0,
      shelfIndex: 0,
      panelThickness: 0.02,
      minSpaceSize: 0.12,
    });

    expect(bounds.min).toBeCloseTo(0.13);
    expect(bounds.max).toBeCloseTo(0.56);
  });
});