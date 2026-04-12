export function getDefaultSectionShelfRatios(shelfCount: number): number[] {
  if (!Number.isFinite(shelfCount) || shelfCount <= 0) {
    return [];
  }

  return Array.from({ length: shelfCount }, (_, index) => {
    return (index + 1) / (shelfCount + 1);
  });
}

export function normalizeSectionShelfRatios(
  ratios: number[] | undefined,
  shelfCount: number,
): number[] {
  const safeShelfCount =
    Number.isFinite(shelfCount) && shelfCount > 0 ? Math.floor(shelfCount) : 0;

  if (safeShelfCount <= 0) {
    return [];
  }

  if (!ratios || ratios.length !== safeShelfCount) {
    return getDefaultSectionShelfRatios(safeShelfCount);
  }

  const hasInvalidRatio = ratios.some((ratio) => !Number.isFinite(ratio));
  if (hasInvalidRatio) {
    return getDefaultSectionShelfRatios(safeShelfCount);
  }

  const normalized = ratios
    .map((ratio) => Math.min(0.999, Math.max(0.001, ratio)))
    .sort((a, b) => a - b);

  return normalized.length === safeShelfCount
    ? normalized
    : getDefaultSectionShelfRatios(safeShelfCount);
}

export function getSectionShelfRatios(
  sectionShelfRatios: number[][] | undefined,
  sectionIndex: number,
  shelfCount: number,
): number[] {
  return normalizeSectionShelfRatios(
    sectionShelfRatios?.[sectionIndex],
    shelfCount,
  );
}

export function getSectionShelfPositions(params: {
  start: number;
  size: number;
  shelfCount: number;
  sectionShelfRatios?: number[][];
  sectionIndex: number;
}): number[] {
  const { start, size, shelfCount, sectionShelfRatios, sectionIndex } = params;
  if (!Number.isFinite(start) || !Number.isFinite(size) || size <= 0) {
    return [];
  }

  const ratios = getSectionShelfRatios(
    sectionShelfRatios,
    sectionIndex,
    shelfCount,
  );

  return ratios.map((ratio) => start + size * ratio);
}

export function getSectionSpaceBounds(params: {
  start: number;
  size: number;
  shelfCount: number;
  sectionShelfRatios?: number[][];
  sectionIndex: number;
  panelThickness: number;
}) {
  const {
    start,
    size,
    shelfCount,
    sectionShelfRatios,
    sectionIndex,
    panelThickness,
  } = params;
  if (
    !Number.isFinite(start) ||
    !Number.isFinite(size) ||
    size <= 0 ||
    !Number.isFinite(panelThickness) ||
    panelThickness < 0
  ) {
    return {
      shelfPositions: [],
      spaces: [],
    };
  }

  const shelfPositions = getSectionShelfPositions({
    start,
    size,
    shelfCount,
    sectionShelfRatios,
    sectionIndex,
  });
  const end = start + size;

  const spaces = Array.from({ length: shelfCount + 1 }, (_, spaceIndex) => {
    const bottom =
      spaceIndex === 0
        ? start
        : shelfPositions[spaceIndex - 1] + panelThickness / 2;
    const top =
      spaceIndex === shelfCount
        ? end
        : shelfPositions[spaceIndex] - panelThickness / 2;

    return {
      bottom,
      top,
      center: (bottom + top) / 2,
      size: top - bottom,
    };
  });

  return {
    shelfPositions,
    spaces,
  };
}

export function getSectionShelfDragBounds(params: {
  start: number;
  size: number;
  shelfCount: number;
  sectionShelfRatios?: number[][];
  sectionIndex: number;
  shelfIndex: number;
  panelThickness: number;
  minSpaceSize: number;
}) {
  const {
    start,
    size,
    shelfCount,
    sectionShelfRatios,
    sectionIndex,
    shelfIndex,
    panelThickness,
    minSpaceSize,
  } = params;
  if (
    !Number.isFinite(start) ||
    !Number.isFinite(size) ||
    size <= 0 ||
    !Number.isFinite(panelThickness) ||
    panelThickness < 0 ||
    !Number.isFinite(minSpaceSize) ||
    minSpaceSize < 0
  ) {
    return {
      min: 0,
      max: 0,
    };
  }

  const shelfPositions = getSectionShelfPositions({
    start,
    size,
    shelfCount,
    sectionShelfRatios,
    sectionIndex,
  });
  if (shelfIndex < 0 || shelfIndex >= shelfPositions.length) {
    return {
      min: start,
      max: start,
    };
  }

  const end = start + size;
  const previousReference =
    shelfIndex === 0 ? start : shelfPositions[shelfIndex - 1];
  const nextReference =
    shelfIndex === shelfPositions.length - 1
      ? end
      : shelfPositions[shelfIndex + 1];

  return {
    min:
      shelfIndex === 0
        ? previousReference + minSpaceSize + panelThickness / 2
        : previousReference + minSpaceSize + panelThickness,
    max:
      shelfIndex === shelfPositions.length - 1
        ? nextReference - minSpaceSize - panelThickness / 2
        : nextReference - minSpaceSize - panelThickness,
  };
}

export function getShelfRatioFromPosition(
  position: number,
  start: number,
  size: number,
): number {
  if (!Number.isFinite(position) || !Number.isFinite(start) || size <= 0) {
    return 0.5;
  }

  return Math.min(0.999, Math.max(0.001, (position - start) / size));
}
