import { describe, expect, it } from "vitest";

import {
  buildCabinetShellRects,
  buildDoubleSeamJointLines,
  buildSideViewSectionRects,
} from "../technicalDrawingModel";

describe("buildCabinetShellRects", () => {
  it("returns side panels after horizontal panels for correct overlap", () => {
    const rects = buildCabinetShellRects({
      x: 0,
      y: 0,
      width: 100,
      height: 240,
      panelThicknessX: 2,
      panelThicknessY: 2,
      baseHeight: 10,
      includeLeft: true,
      includeRight: true,
    });

    expect(rects.map((rect) => rect.width)).toEqual([96, 96, 2, 2]);
  });

  it("keeps outer side panels full height when base exists", () => {
    const rects = buildCabinetShellRects({
      x: 0,
      y: 0,
      width: 100,
      height: 240,
      panelThicknessX: 2,
      panelThicknessY: 2,
      baseHeight: 10,
      includeLeft: true,
      includeRight: true,
    });

    const left = rects.find((rect) => rect.x === 0 && rect.width === 2);
    const right = rects.find((rect) => rect.x === 98 && rect.width === 2);
    const bottom = rects.find((rect) => rect.y === 228 && rect.height === 2);

    expect(left?.height).toBe(240);
    expect(right?.height).toBe(240);
    expect(bottom).toBeDefined();
  });

  it("still raises the bottom panel above the base area", () => {
    const rects = buildCabinetShellRects({
      x: 10,
      y: 20,
      width: 80,
      height: 200,
      panelThicknessX: 3,
      panelThicknessY: 3,
      baseHeight: 15,
    });

    const bottom = rects.find(
      (rect) =>
        rect.x === 13 &&
        rect.width === 74 &&
        rect.height === 3 &&
        rect.y > 100,
    );

    expect(bottom?.y).toBe(202);
  });
});

describe("buildDoubleSeamJointLines", () => {
  it("adds top and bottom join markers for both seam panels", () => {
    const lines = buildDoubleSeamJointLines({
      x: 50,
      y: 10,
      height: 200,
      thickness: 2,
      panelThicknessY: 3,
      baseHeight: 15,
    });

    expect(lines).toEqual([
      { x1: 48, y1: 10, x2: 48, y2: 13 },
      { x1: 52, y1: 10, x2: 52, y2: 13 },
      { x1: 48, y1: 192, x2: 48, y2: 195 },
      { x1: 52, y1: 192, x2: 52, y2: 195 },
    ]);
  });
});

describe("buildSideViewSectionRects", () => {
  it("returns inner top and bottom panels before outer shell", () => {
    const rects = buildSideViewSectionRects({
      x: 10,
      y: 20,
      depth: 60,
      height: 200,
      topBottomThickness: 3,
      backThickness: 1,
      baseHeight: 15,
    });

    expect(rects.map((rect) => rect.tone)).toEqual([
      "inner",
      "inner",
      "outer",
      "back",
    ]);
  });

  it("can omit inner top and bottom panels for external side views", () => {
    const rects = buildSideViewSectionRects({
      x: 10,
      y: 20,
      depth: 60,
      height: 200,
      topBottomThickness: 3,
      backThickness: 1,
      baseHeight: 15,
      includeInnerPanels: false,
    });

    expect(rects).toEqual([
      {
        x: 10,
        y: 20,
        width: 60,
        height: 200,
        tone: "outer",
      },
      {
        x: 10,
        y: 20,
        width: 1,
        height: 200,
        tone: "back",
      },
    ]);
  });

  it("keeps side and back full height while bottom panel stays above base", () => {
    const rects = buildSideViewSectionRects({
      x: 10,
      y: 20,
      depth: 60,
      height: 200,
      topBottomThickness: 3,
      backThickness: 1,
      baseHeight: 15,
    });

    expect(rects[2]).toEqual({
      x: 10,
      y: 20,
      width: 60,
      height: 200,
      tone: "outer",
    });
    expect(rects[3]).toEqual({
      x: 10,
      y: 20,
      width: 1,
      height: 200,
      tone: "back",
    });
    expect(rects[1]).toEqual({
      x: 11,
      y: 202,
      width: 59,
      height: 3,
      tone: "inner",
    });
  });
});