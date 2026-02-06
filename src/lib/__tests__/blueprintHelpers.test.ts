import { describe, it, expect } from "vitest";
import {
  buildBlocksFromBoundaries,
  getCompartmentsForColumn,
  createMapY,
  createMapYForColumn,
  type GetCompartmentsParams,
} from "../blueprintHelpers";

// ── buildBlocksFromBoundaries ────────────────────────────────────────

describe("buildBlocksFromBoundaries", () => {
  it("no boundaries → single block spanning full width", () => {
    const blocks = buildBlocksFromBoundaries(200, undefined);
    expect(blocks).toEqual([{ start: 0, end: 200, width: 200 }]);
  });

  it("empty array → single block spanning full width", () => {
    const blocks = buildBlocksFromBoundaries(200, []);
    expect(blocks).toEqual([{ start: 0, end: 200, width: 200 }]);
  });

  it("one boundary at center (0) for 200cm → two equal blocks", () => {
    // boundary 0 in meters, width 200cm → w=2m, boundaryCm = (0 + 1) * 100 = 100
    const blocks = buildBlocksFromBoundaries(200, [0]);
    expect(blocks.length).toBe(2);
    expect(blocks[0]).toEqual({ start: 0, end: 100, width: 100 });
    expect(blocks[1]).toEqual({ start: 100, end: 200, width: 100 });
  });

  it("two boundaries for 300cm → three blocks", () => {
    // w=3m, boundaries [-0.5, 0.5] → boundaryCm = [(-0.5+1.5)*100, (0.5+1.5)*100] = [100, 200]
    const blocks = buildBlocksFromBoundaries(300, [-0.5, 0.5]);
    expect(blocks.length).toBe(3);
    expect(blocks[0]).toEqual({ start: 0, end: 100, width: 100 });
    expect(blocks[1]).toEqual({ start: 100, end: 200, width: 100 });
    expect(blocks[2]).toEqual({ start: 200, end: 300, width: 100 });
  });

  it("unsorted boundaries → still correct sorted blocks", () => {
    // Same as above but reversed
    const blocks = buildBlocksFromBoundaries(300, [0.5, -0.5]);
    expect(blocks.length).toBe(3);
    expect(blocks[0].start).toBe(0);
    expect(blocks[1].start).toBe(100);
    expect(blocks[2].start).toBe(200);
  });

  it("boundary at edge (0 or width) → skipped gracefully", () => {
    // boundary at -1.0 for width=200cm → boundaryCm = (-1 + 1) * 100 = 0 → not > prevX(0), skipped
    const blocks = buildBlocksFromBoundaries(200, [-1.0]);
    expect(blocks.length).toBe(1);
    expect(blocks[0]).toEqual({ start: 0, end: 200, width: 200 });
  });

  it("asymmetric boundary produces different width columns", () => {
    // w=2m, boundary at -0.5 → boundaryCm = (-0.5 + 1) * 100 = 50
    const blocks = buildBlocksFromBoundaries(200, [-0.5]);
    expect(blocks.length).toBe(2);
    expect(blocks[0]).toEqual({ start: 0, end: 50, width: 50 });
    expect(blocks[1]).toEqual({ start: 50, end: 200, width: 150 });
  });
});

// ── getCompartmentsForColumn ─────────────────────────────────────────

describe("getCompartmentsForColumn", () => {
  const defaultParams: GetCompartmentsParams = {
    colIdx: 0,
    columnHeights: {},
    height: 200, // 200cm wardrobe
    columnHorizontalBoundaries: {},
    columnModuleBoundaries: {},
    columnTopModuleShelves: {},
    hasBase: false,
    baseHeight: 0,
    tCm: 1.8, // 18mm panel thickness
  };

  it("single column, no shelves, no base → one compartment A1", () => {
    const comps = getCompartmentsForColumn(defaultParams);
    expect(comps.length).toBe(1);
    expect(comps[0].key).toBe("A1");
    expect(comps[0].bottomY).toBeCloseTo(1.8, 1); // tCm
    expect(comps[0].topY).toBeCloseTo(198.2, 1); // height - tCm
  });

  it("single column, no shelves, with base → A1 starts above base", () => {
    const comps = getCompartmentsForColumn({
      ...defaultParams,
      hasBase: true,
      baseHeight: 10, // 10cm base
    });
    expect(comps.length).toBe(1);
    expect(comps[0].key).toBe("A1");
    expect(comps[0].bottomY).toBeCloseTo(11.8, 1); // baseHeight + tCm
    expect(comps[0].topY).toBeCloseTo(198.2, 1); // height - tCm
  });

  it("single column, 2 shelves → 3 compartments A1, A2, A3", () => {
    const comps = getCompartmentsForColumn({
      ...defaultParams,
      columnHorizontalBoundaries: {
        0: [0.5, 1.0], // shelves at 50cm and 100cm from floor (floor-origin meters)
      },
    });
    expect(comps.length).toBe(3);
    expect(comps[0].key).toBe("A1");
    expect(comps[1].key).toBe("A2");
    expect(comps[2].key).toBe("A3");

    // A1: from innerBottom to first shelf
    expect(comps[0].bottomY).toBeCloseTo(1.8, 1);
    // A3: topY should be innerTop
    expect(comps[2].topY).toBeCloseTo(198.2, 1);
  });

  it("column with module boundary (tall wardrobe) → bottom + top compartments", () => {
    const comps = getCompartmentsForColumn({
      ...defaultParams,
      height: 250, // 250cm tall
      columnModuleBoundaries: { 0: 2.0 }, // split at 200cm from floor (floor-origin meters)
    });
    // With h=250cm and module boundary at 200cm:
    // Bottom module: A1 from 1.8 to (200 - 1.8) = 198.2
    // Top module: A2 from (200 + 1.8) = 201.8 to (250 - 1.8) = 248.2
    expect(comps.length).toBe(2);
    expect(comps[0].key).toBe("A1");
    expect(comps[1].key).toBe("A2");
    expect(comps[0].topY).toBeCloseTo(200 - 1.8, 1);
    expect(comps[1].bottomY).toBeCloseTo(200 + 1.8, 1);
    expect(comps[1].topY).toBeCloseTo(248.2, 1);
  });

  it("module boundary + shelves in both modules → correct count and keys", () => {
    const comps = getCompartmentsForColumn({
      ...defaultParams,
      height: 250,
      columnHorizontalBoundaries: {
        0: [1.0], // shelf at 100cm in bottom module
      },
      columnModuleBoundaries: { 0: 2.0 }, // split at 200cm
      columnTopModuleShelves: {
        0: [2.2], // shelf at 220cm in top module
      },
    });
    // Bottom module: A1 (1.8 to ~100), A2 (~100 to 198.2)
    // Top module: A3 (201.8 to ~220), A4 (~220 to 248.2)
    expect(comps.length).toBe(4);
    expect(comps[0].key).toBe("A1");
    expect(comps[1].key).toBe("A2");
    expect(comps[2].key).toBe("A3");
    expect(comps[3].key).toBe("A4");
  });

  it("module boundary outside valid range → ignored, single module", () => {
    const comps = getCompartmentsForColumn({
      ...defaultParams,
      height: 250,
      // Module boundary at 2cm from floor → 2 < innerBottom + tCm (1.8 + 1.8 = 3.6) → INVALID
      columnModuleBoundaries: { 0: 0.02 },
    });
    // Invalid boundary → treated as no module split
    expect(comps.length).toBe(1);
    expect(comps[0].key).toBe("A1");
  });

  it("module boundary only activates for tall wardrobes (>200cm)", () => {
    const comps = getCompartmentsForColumn({
      ...defaultParams,
      height: 180, // short wardrobe
      columnModuleBoundaries: { 0: 1.0 }, // boundary at 100cm
    });
    // colH = 1.8m which is < splitThreshold (2.0m), so module boundary ignored
    expect(comps.length).toBe(1);
    expect(comps[0].key).toBe("A1");
  });

  it("shelf outside column bounds → filtered out", () => {
    const comps = getCompartmentsForColumn({
      ...defaultParams,
      columnHorizontalBoundaries: {
        0: [0.001, 2.5], // one below innerBottom (1.8cm = 0.018m), one above height
      },
    });
    // Both shelves outside valid range → filtered, single compartment
    expect(comps.length).toBe(1);
    expect(comps[0].key).toBe("A1");
  });

  it("second column (colIdx=1) → labels start with B", () => {
    const comps = getCompartmentsForColumn({
      ...defaultParams,
      colIdx: 1,
    });
    expect(comps.length).toBe(1);
    expect(comps[0].key).toBe("B1");
  });

  it("third column (colIdx=2) → labels start with C", () => {
    const comps = getCompartmentsForColumn({
      ...defaultParams,
      colIdx: 2,
      columnHorizontalBoundaries: { 2: [0.5] },
    });
    expect(comps.length).toBe(2);
    expect(comps[0].key).toBe("C1");
    expect(comps[1].key).toBe("C2");
  });

  it("column with custom height uses columnHeights override", () => {
    const comps = getCompartmentsForColumn({
      ...defaultParams,
      height: 200,
      columnHeights: { 0: 150 }, // column 0 is only 150cm
    });
    expect(comps.length).toBe(1);
    expect(comps[0].topY).toBeCloseTo(148.2, 1); // 150 - tCm
  });
});

// ── Coordinate mappers ───────────────────────────────────────────────

describe("createMapY", () => {
  // Setup: frontViewY=100, scaledHeight=400, scale=2, height=200cm
  const mapY = createMapY(100, 400, 2, 200);

  it("floor level (y=0) maps to bottom of SVG frame", () => {
    // frontViewY + scaledHeight - 0 * scale = 100 + 400 = 500
    expect(mapY(0)).toBe(500);
  });

  it("top (y=height) maps to top of SVG frame", () => {
    // 100 + 400 - 200 * 2 = 500 - 400 = 100
    expect(mapY(200)).toBe(100);
  });

  it("mid-height maps to middle", () => {
    // 100 + 400 - 100 * 2 = 500 - 200 = 300
    expect(mapY(100)).toBe(300);
  });

  it("negative Y clamps to 0", () => {
    expect(mapY(-50)).toBe(mapY(0));
  });

  it("Y > height clamps to height", () => {
    expect(mapY(300)).toBe(mapY(200));
  });
});

describe("createMapYForColumn", () => {
  const mapYForColumn = createMapYForColumn(100, 400, 2, 200, { 1: 150 });

  it("default column uses wardrobe height", () => {
    // Column 0: no override → uses height=200
    expect(mapYForColumn(200, 0)).toBe(100); // top of frame
  });

  it("column with shorter height clamps to column height", () => {
    // Column 1: height=150, y=200 → clamps to 150
    // 100 + 400 - 150 * 2 = 500 - 300 = 200
    expect(mapYForColumn(200, 1)).toBe(200);
    expect(mapYForColumn(150, 1)).toBe(200); // same, at column top
  });

  it("floor level is same for all columns", () => {
    expect(mapYForColumn(0, 0)).toBe(500);
    expect(mapYForColumn(0, 1)).toBe(500);
  });
});
