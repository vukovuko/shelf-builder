import { DRAWER_HEIGHT_CM, MAX_DRAWER_HEIGHT_CM } from "./wardrobe-constants";

export const DRAWER_FRONT_EDGE_CLEARANCE_PER_SIDE_M = 2.5 / 1000;
export const DRAWER_FRONT_TOTAL_CLEARANCE_M =
  DRAWER_FRONT_EDGE_CLEARANCE_PER_SIDE_M * 2;

export function shouldUseDrawerStack(drawerCount: number): boolean {
  return Number.isFinite(drawerCount) && drawerCount > 1;
}

export function getRemovedBottomShelves(
  shelfCount: number,
  drawerCount: number,
): number {
  if (shelfCount <= 0 || drawerCount <= 1) {
    return 0;
  }

  return Math.min(shelfCount, drawerCount - 1);
}

export function getVisibleShelfStartIndex(
  shelfCount: number,
  drawerCount: number,
): number {
  return getRemovedBottomShelves(shelfCount, drawerCount) + 1;
}

export function getMaxDrawersForOpening(openingHeightCm: number): number {
  if (!Number.isFinite(openingHeightCm) || openingHeightCm <= 0) {
    return 0;
  }

  return Math.max(0, Math.floor(openingHeightCm / DRAWER_HEIGHT_CM));
}

export function isDrawerSlotHeightValid(slotHeightCm: number): boolean {
  return (
    Number.isFinite(slotHeightCm) &&
    slotHeightCm >= DRAWER_HEIGHT_CM &&
    slotHeightCm <= MAX_DRAWER_HEIGHT_CM
  );
}

export function getValidDrawerCountRange(
  openingHeightCm: number,
  shelfCount: number,
) {
  const safeOpeningHeightCm = Math.max(openingHeightCm, 0);
  const safeShelfCount = Math.max(0, Math.floor(shelfCount));

  if (!Number.isFinite(safeOpeningHeightCm) || safeOpeningHeightCm <= 0) {
    return { min: 0, max: 0 };
  }

  if (safeShelfCount > 0) {
    const slotHeightCm = safeOpeningHeightCm / (safeShelfCount + 1);
    if (!isDrawerSlotHeightValid(slotHeightCm)) {
      return { min: 0, max: 0 };
    }

    return {
      min: 1,
      max: safeShelfCount + 1,
    };
  }

  if (!isDrawerSlotHeightValid(safeOpeningHeightCm)) {
    return { min: 0, max: 0 };
  }

  return { min: 1, max: 1 };
}

export function isDrawerCountValid(
  drawerCount: number,
  openingHeightCm: number,
  shelfCount: number,
): boolean {
  if (!Number.isFinite(drawerCount) || drawerCount <= 0) {
    return false;
  }

  const { min, max } = getValidDrawerCountRange(openingHeightCm, shelfCount);
  return min > 0 && drawerCount >= min && drawerCount <= max;
}

export function normalizeDrawerCount(
  drawerCount: number,
  openingHeightCm: number,
  shelfCount: number,
): number {
  if (!Number.isFinite(drawerCount) || drawerCount <= 0) {
    return 0;
  }

  const { min, max } = getValidDrawerCountRange(openingHeightCm, shelfCount);
  if (min === 0 || max === 0) {
    return 0;
  }

  return Math.min(Math.max(Math.floor(drawerCount), min), max);
}

export function getDrawerFrontSpan({
  elementInnerWidthM,
  elementOuterWidthM,
  sectionCount,
  sectionIndex,
  sideThicknessM,
  isExternal,
}: {
  elementInnerWidthM: number;
  elementOuterWidthM: number;
  sectionCount: number;
  sectionIndex: number;
  sideThicknessM: number;
  isExternal: boolean;
}) {
  const safeWidth = Math.max(elementInnerWidthM, 0);
  const safeOuterWidth = Math.max(elementOuterWidthM, 0);
  const safeSideThickness = Math.max(sideThicknessM, 0);
  const safeSectionCount = Math.max(1, Math.floor(sectionCount));
  const safeSectionIndex = Math.min(
    Math.max(0, Math.floor(sectionIndex)),
    safeSectionCount - 1,
  );

  const sectionSpan = safeWidth / safeSectionCount;

  if (!isExternal) {
    const openingStart =
      safeSectionIndex * sectionSpan +
      (safeSectionIndex > 0 ? safeSideThickness / 2 : 0);
    const openingEnd =
      (safeSectionIndex + 1) * sectionSpan -
      (safeSectionIndex < safeSectionCount - 1 ? safeSideThickness / 2 : 0);
    const inset = DRAWER_FRONT_EDGE_CLEARANCE_PER_SIDE_M;
    const start = openingStart + inset;
    const end = Math.max(openingEnd - inset, start);

    return {
      start,
      end,
      width: end - start,
      center: (start + end) / 2,
    };
  }

  if (safeSectionCount === 1) {
    const start = DRAWER_FRONT_EDGE_CLEARANCE_PER_SIDE_M;
    const end = Math.max(
      safeOuterWidth - DRAWER_FRONT_EDGE_CLEARANCE_PER_SIDE_M,
      start,
    );
    return {
      start,
      end,
      width: end - start,
      center: (start + end) / 2,
    };
  }

  const leftBoundary =
    safeSectionIndex === 0
      ? 0
      : safeSideThickness + safeSectionIndex * sectionSpan;
  const rightBoundary =
    safeSectionIndex === safeSectionCount - 1
      ? safeOuterWidth
      : safeSideThickness + (safeSectionIndex + 1) * sectionSpan;
  const start = leftBoundary + DRAWER_FRONT_EDGE_CLEARANCE_PER_SIDE_M;
  const end = Math.max(
    rightBoundary - DRAWER_FRONT_EDGE_CLEARANCE_PER_SIDE_M,
    start,
  );

  return {
    start,
    end,
    width: Math.max(end - start, 0),
    center: (start + end) / 2,
  };
}

export function getDrawerStackMetrics(
  openingHeightM: number,
  shelfCount: number,
  drawerCount: number,
) {
  if (
    !Number.isFinite(openingHeightM) ||
    openingHeightM <= 0 ||
    !Number.isFinite(drawerCount) ||
    drawerCount <= 0
  ) {
    return {
      drawerCount: 0,
      slotHeight: 0,
      stackHeight: 0,
      remainingHeight: 0,
    };
  }

  const safeDrawerCount = Math.max(0, Math.floor(drawerCount));
  if (safeDrawerCount <= 0) {
    return {
      drawerCount: 0,
      slotHeight: 0,
      stackHeight: 0,
      removedBottomShelves: 0,
    };
  }

  const safeShelfCount = Math.max(0, Math.floor(shelfCount));
  const removedBottomShelves = getRemovedBottomShelves(
    safeShelfCount,
    safeDrawerCount,
  );

  if (safeShelfCount > 0) {
    const slotHeight = openingHeightM / (safeShelfCount + 1);
    const usedDrawerCount = Math.min(safeDrawerCount, safeShelfCount + 1);
    const stackHeight = slotHeight * usedDrawerCount;

    return {
      drawerCount: usedDrawerCount,
      slotHeight,
      stackHeight,
      removedBottomShelves,
    };
  }

  const slotHeight = openingHeightM / safeDrawerCount;
  const stackHeight = slotHeight * safeDrawerCount;

  return {
    drawerCount: safeDrawerCount,
    slotHeight,
    stackHeight,
    removedBottomShelves,
  };
}
