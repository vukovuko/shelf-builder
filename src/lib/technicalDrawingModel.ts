export type TechnicalRectTone =
  | "outer"
  | "inner"
  | "seam"
  | "base"
  | "back"
  | "drawer";

export interface TechnicalRect {
  x: number;
  y: number;
  width: number;
  height: number;
  tone: TechnicalRectTone;
}

export interface SectionBound {
  x: number;
  width: number;
}

export interface TechnicalLine {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
}

export interface VerticalPanelSpan {
  start: number;
  height: number;
}

export function buildVerticalPanelSpans(params: {
  totalHeight: number;
  splitAt?: number | null;
}): VerticalPanelSpan[] {
  const { totalHeight, splitAt = null } = params;

  if (totalHeight <= 0) {
    return [];
  }

  if (splitAt === null || splitAt <= 0 || splitAt >= totalHeight) {
    return [{ start: 0, height: totalHeight }];
  }

  return [
    { start: 0, height: splitAt },
    { start: splitAt, height: totalHeight - splitAt },
  ].filter((span) => span.height > 0);
}

export function buildCabinetShellRects(params: {
  x: number;
  y: number;
  width: number;
  height: number;
  panelThicknessX: number;
  panelThicknessY?: number;
  baseHeight?: number;
  includeLeft?: boolean;
  includeRight?: boolean;
  includeTop?: boolean;
  includeBottom?: boolean;
  outerTone?: TechnicalRectTone;
  horizontalTone?: TechnicalRectTone;
}): TechnicalRect[] {
  const {
    x,
    y,
    width,
    height,
    panelThicknessX,
    panelThicknessY = panelThicknessX,
    baseHeight = 0,
    includeLeft = true,
    includeRight = true,
    includeTop = true,
    includeBottom = true,
    outerTone = "outer",
    horizontalTone = "outer",
  } = params;

  if (width <= 0 || height <= 0) {
    return [];
  }

  const rects: TechnicalRect[] = [];
  const panelSpanHeight = Math.max(height - baseHeight, 0);
  const innerWidth = Math.max(width - 2 * panelThicknessX, 0);
  const bottomY = y + height - baseHeight - panelThicknessY;

  if (includeLeft && panelThicknessX > 0 && panelSpanHeight > 0) {
    rects.push({
      x,
      y,
      width: panelThicknessX,
      height: panelSpanHeight,
      tone: outerTone,
    });
  }

  if (includeRight && panelThicknessX > 0 && panelSpanHeight > 0) {
    rects.push({
      x: x + width - panelThicknessX,
      y,
      width: panelThicknessX,
      height: panelSpanHeight,
      tone: outerTone,
    });
  }

  if (includeTop && innerWidth > 0 && panelThicknessY > 0) {
    rects.push({
      x: x + panelThicknessX,
      y,
      width: innerWidth,
      height: panelThicknessY,
      tone: horizontalTone,
    });
  }

  if (includeBottom && innerWidth > 0 && panelThicknessY > 0) {
    rects.push({
      x: x + panelThicknessX,
      y: bottomY,
      width: innerWidth,
      height: panelThicknessY,
      tone: horizontalTone,
    });
  }

  return rects;
}

export function buildDoubleSeamRects(params: {
  x: number;
  y: number;
  height: number;
  thickness: number;
}): TechnicalRect[] {
  const { x, y, height, thickness } = params;
  if (height <= 0 || thickness <= 0) {
    return [];
  }

  return [
    { x: x - thickness, y, width: thickness, height, tone: "seam" },
    { x, y, width: thickness, height, tone: "seam" },
  ];
}

export function computeSectionBounds(params: {
  x: number;
  width: number;
  sectionCount: number;
  dividerThickness: number;
}): SectionBound[] {
  const { x, width, sectionCount, dividerThickness } = params;
  if (sectionCount <= 0 || width <= 0) {
    return [];
  }

  const sectionWidth = Math.max(
    (width - (sectionCount - 1) * dividerThickness) / sectionCount,
    0,
  );

  return Array.from({ length: sectionCount }, (_, index) => ({
    x: x + index * (sectionWidth + dividerThickness),
    width: sectionWidth,
  }));
}

export function buildSectionDividerRects(params: {
  x: number;
  width: number;
  y: number;
  height: number;
  sectionCount: number;
  dividerThickness: number;
}): TechnicalRect[] {
  const { x, width, y, height, sectionCount, dividerThickness } = params;
  if (sectionCount <= 1 || dividerThickness <= 0 || height <= 0) {
    return [];
  }

  const sections = computeSectionBounds({
    x,
    width,
    sectionCount,
    dividerThickness,
  });

  return sections.slice(1).map((section) => ({
    x: section.x - dividerThickness,
    y,
    width: dividerThickness,
    height,
    tone: "seam",
  }));
}

export function buildEvenShelfRects(params: {
  x: number;
  width: number;
  topY: number;
  bottomY: number;
  shelfCount: number;
  shelfThickness: number;
  tone?: TechnicalRectTone;
}): TechnicalRect[] {
  const { x, width, topY, bottomY, shelfCount, shelfThickness, tone = "inner" } =
    params;
  if (shelfCount <= 0 || width <= 0 || bottomY <= topY || shelfThickness <= 0) {
    return [];
  }

  const usableHeight = bottomY - topY;
  const gap = usableHeight / (shelfCount + 1);

  return Array.from({ length: shelfCount }, (_, index) => {
    const centerY = topY + (index + 1) * gap;
    return {
      x,
      y: centerY - shelfThickness / 2,
      width,
      height: shelfThickness,
      tone,
    };
  });
}

export function buildSideViewSectionRects(params: {
  x: number;
  y: number;
  depth: number;
  height: number;
  topBottomThickness: number;
  backThickness: number;
  baseHeight?: number;
}): TechnicalRect[] {
  const {
    x,
    y,
    depth,
    height,
    topBottomThickness,
    backThickness,
    baseHeight = 0,
  } = params;

  if (depth <= 0 || height <= 0) {
    return [];
  }

  const rects: TechnicalRect[] = [
    {
      x,
      y,
      width: depth,
      height: Math.max(height - baseHeight, 0),
      tone: "outer",
    },
  ];

  const innerWidth = Math.max(depth - backThickness, 0);

  if (backThickness > 0) {
    rects.push({
      x,
      y,
      width: backThickness,
      height: Math.max(height - baseHeight, 0),
      tone: "back",
    });
  }

  if (innerWidth > 0 && topBottomThickness > 0) {
    rects.push({
      x: x + backThickness,
      y,
      width: innerWidth,
      height: topBottomThickness,
      tone: "inner",
    });
    rects.push({
      x: x + backThickness,
      y: y + height - baseHeight - topBottomThickness,
      width: innerWidth,
      height: topBottomThickness,
      tone: "inner",
    });
  }

  return rects;
}

export function buildCabinetShellJointLines(params: {
  x: number;
  y: number;
  width: number;
  height: number;
  panelThicknessX: number;
  panelThicknessY?: number;
  baseHeight?: number;
  includeLeft?: boolean;
  includeRight?: boolean;
}): TechnicalLine[] {
  const {
    x,
    y,
    width,
    height,
    panelThicknessX,
    panelThicknessY = panelThicknessX,
    baseHeight = 0,
    includeLeft = true,
    includeRight = true,
  } = params;

  const lines: TechnicalLine[] = [];
  const innerLeft = x + panelThicknessX;
  const innerRight = x + width - panelThicknessX;
  const bottomY = y + height - baseHeight - panelThicknessY;

  if (includeLeft) {
    lines.push({ x1: innerLeft, y1: y, x2: innerLeft, y2: y + panelThicknessY });
    lines.push({ x1: innerLeft, y1: bottomY, x2: innerLeft, y2: bottomY + panelThicknessY });
  }

  if (includeRight) {
    lines.push({ x1: innerRight, y1: y, x2: innerRight, y2: y + panelThicknessY });
    lines.push({ x1: innerRight, y1: bottomY, x2: innerRight, y2: bottomY + panelThicknessY });
  }

  return lines;
}

export function buildDoubleSeamCenterLine(params: {
  x: number;
  y: number;
  height: number;
}): TechnicalLine | null {
  const { x, y, height } = params;
  if (height <= 0) {
    return null;
  }

  return { x1: x, y1: y, x2: x, y2: y + height };
}