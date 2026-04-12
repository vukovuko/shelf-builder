import { getSectionShelfPositions } from "@/lib/section-shelf-layout";
import { parseSubCompKey } from "@/lib/store";

export const DOOR_EDGE_CLEARANCE_PER_SIDE_M = 2.5 / 1000;
export const DOUBLE_DOOR_CENTER_GAP_M = 5 / 1000;

type ElementConfigLike = {
  columns?: number;
  rowCounts?: number[];
  sectionShelfRatios?: number[][];
};

export type DoorGeometryContext = {
  columnLeft: number;
  columnRight: number;
  columnBottomY: number;
  columnHeight: number;
  baseHeight: number;
  panelThickness: number;
  columnShelfYs: number[];
  columnModuleBoundary: number | null;
  topModuleShelfYs: number[];
  elementConfigs: Record<string, ElementConfigLike>;
};

export type DoorSelectionBounds = {
  leftX: number;
  rightX: number;
  bottomY: number;
  topY: number;
  centerX: number;
  centerY: number;
  width: number;
  height: number;
};

function insetBounds(
  leftX: number,
  rightX: number,
  bottomY: number,
  topY: number,
) {
  const inset = DOOR_EDGE_CLEARANCE_PER_SIDE_M;
  const safeLeftX = leftX + inset;
  const safeRightX = Math.max(safeLeftX, rightX - inset);
  const safeBottomY = bottomY + inset;
  const safeTopY = Math.max(safeBottomY, topY - inset);

  return {
    leftX: safeLeftX,
    rightX: safeRightX,
    bottomY: safeBottomY,
    topY: safeTopY,
  };
}

type MainCompBounds = {
  openBottomY: number;
  openTopY: number;
  outerBottomY: number;
  outerTopY: number;
};

function isFiniteNumber(value: number | null | undefined): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

function getMainCompBounds(
  compIdxZeroBased: number,
  context: DoorGeometryContext,
): MainCompBounds | null {
  const {
    columnBottomY,
    columnHeight,
    baseHeight,
    panelThickness,
    columnShelfYs,
    columnModuleBoundary,
    topModuleShelfYs,
  } = context;

  const columnTopY = columnBottomY + columnHeight;
  const t = panelThickness;
  const bottomOpenStart = columnBottomY + baseHeight + t;
  const safeModuleBoundary =
    isFiniteNumber(columnModuleBoundary) &&
    columnModuleBoundary > bottomOpenStart + t &&
    columnModuleBoundary < columnTopY - t
      ? columnModuleBoundary
      : null;
  const hasModuleBoundary = isFiniteNumber(safeModuleBoundary);
  const bottomOpenEnd = hasModuleBoundary
    ? safeModuleBoundary - t
    : columnTopY - t;

  const bottomShelves = [...columnShelfYs]
    .filter((y) => y > bottomOpenStart && y < bottomOpenEnd)
    .sort((a, b) => a - b);
  const bottomAllYs = [bottomOpenStart, ...bottomShelves, bottomOpenEnd];
  const bottomCompCount = bottomAllYs.length - 1;

  if (hasModuleBoundary && compIdxZeroBased >= bottomCompCount) {
    const topOpenStart = safeModuleBoundary + t;
    const topOpenEnd = columnTopY - t;
    const topShelves = [...topModuleShelfYs]
      .filter((y) => y > topOpenStart && y < topOpenEnd)
      .sort((a, b) => a - b);
    const topAllYs = [topOpenStart, ...topShelves, topOpenEnd];
    const topIdx = compIdxZeroBased - bottomCompCount;

    if (topIdx < 0 || topIdx >= topAllYs.length - 1) {
      return null;
    }

    const openBottomY = topAllYs[topIdx];
    const openTopY = topAllYs[topIdx + 1];
    const isFirst = topIdx === 0;
    const isLast = topIdx === topAllYs.length - 2;

    return {
      openBottomY,
      openTopY,
      outerBottomY: openBottomY - (isFirst ? t : t / 2),
      outerTopY: openTopY + (isLast ? t : t / 2),
    };
  }

  if (compIdxZeroBased < 0 || compIdxZeroBased >= bottomAllYs.length - 1) {
    return null;
  }

  const openBottomY = bottomAllYs[compIdxZeroBased];
  const openTopY = bottomAllYs[compIdxZeroBased + 1];
  const isFirst = compIdxZeroBased === 0;
  const isLast = compIdxZeroBased === bottomAllYs.length - 2;

  return {
    openBottomY,
    openTopY,
    outerBottomY: openBottomY - (isFirst ? t : t / 2),
    outerTopY: openTopY + (isLast ? t : t / 2),
  };
}

export function getDoorSelectionBounds(
  key: string,
  context: DoorGeometryContext,
): DoorSelectionBounds | null {
  const parsed = parseSubCompKey(key);
  if (!parsed) {
    return null;
  }

  const mainBounds = getMainCompBounds(parsed.compIdx - 1, context);
  if (!mainBounds) {
    return null;
  }

  const t = context.panelThickness;
  const columnCenterX = (context.columnLeft + context.columnRight) / 2;

  if (!parsed.isSubComp) {
    const insetResult = insetBounds(
      context.columnLeft,
      context.columnRight,
      mainBounds.outerBottomY,
      mainBounds.outerTopY,
    );
    return {
      ...insetResult,
      centerX: (insetResult.leftX + insetResult.rightX) / 2,
      centerY: (insetResult.bottomY + insetResult.topY) / 2,
      width: insetResult.rightX - insetResult.leftX,
      height: insetResult.topY - insetResult.bottomY,
    };
  }

  const cfg = context.elementConfigs[parsed.compKey] ?? {
    columns: 1,
    rowCounts: [0],
  };
  const innerCols = Math.max(1, cfg.columns ?? 1);
  const innerLeft = context.columnLeft + t;
  const innerWidth = Math.max(context.columnRight - context.columnLeft - 2 * t, 0);
  const sectionWidth = innerCols > 0 ? innerWidth / innerCols : innerWidth;
  const sectionIdx = Math.min(Math.max(parsed.sectionIdx, 0), innerCols - 1);

  const leftX =
    sectionIdx === 0 ? context.columnLeft : innerLeft + sectionIdx * sectionWidth;
  const rightX =
    sectionIdx === innerCols - 1
      ? context.columnRight
      : innerLeft + (sectionIdx + 1) * sectionWidth;

  const shelfCount = Math.max(0, cfg.rowCounts?.[sectionIdx] ?? 0);
  const shelfPositions = getSectionShelfPositions({
    start: mainBounds.openBottomY,
    size: mainBounds.openTopY - mainBounds.openBottomY,
    shelfCount,
    sectionShelfRatios: cfg.sectionShelfRatios,
    sectionIndex: sectionIdx,
  });
  const clampedSpaceIdx = Math.min(Math.max(parsed.spaceIdx, 0), shelfCount);
  const bottomY =
    clampedSpaceIdx === 0
      ? mainBounds.outerBottomY
      : shelfPositions[clampedSpaceIdx - 1];
  const topY =
    clampedSpaceIdx === shelfCount
      ? mainBounds.outerTopY
      : shelfPositions[clampedSpaceIdx];

  const insetResult = insetBounds(leftX, rightX, bottomY, topY);

  return {
    ...insetResult,
    centerX: (insetResult.leftX + insetResult.rightX) / 2,
    centerY: (insetResult.bottomY + insetResult.topY) / 2,
    width: insetResult.rightX - insetResult.leftX,
    height: insetResult.topY - insetResult.bottomY,
  };
}

export function getDoorGroupBounds(
  keys: string[],
  context: DoorGeometryContext,
): DoorSelectionBounds | null {
  let aggregate: DoorSelectionBounds | null = null;

  for (const key of keys) {
    const bounds = getDoorSelectionBounds(key, context);
    if (!bounds) {
      continue;
    }

    if (!aggregate) {
      aggregate = bounds;
      continue;
    }

    const leftX = Math.min(aggregate.leftX, bounds.leftX);
    const rightX = Math.max(aggregate.rightX, bounds.rightX);
    const bottomY = Math.min(aggregate.bottomY, bounds.bottomY);
    const topY = Math.max(aggregate.topY, bounds.topY);

    aggregate = {
      leftX,
      rightX,
      bottomY,
      topY,
      centerX: (leftX + rightX) / 2,
      centerY: (bottomY + topY) / 2,
      width: rightX - leftX,
      height: topY - bottomY,
    };
  }

  return aggregate;
}