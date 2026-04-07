import { DRAWER_HEIGHT_CM } from "./wardrobe-constants";

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