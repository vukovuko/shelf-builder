type ShelfSnapshot = {
  height?: number;
  hasBase?: boolean;
  baseHeight?: number;
  panelThickness?: number;
  verticalBoundaries?: number[];
  columnHeights?: Record<number, number>;
  columnHorizontalBoundaries?: Record<number, number[] | null | undefined>;
  columnModuleBoundaries?: Record<number, number | null | undefined>;
  columnTopModuleShelves?: Record<number, number[] | null | undefined>;
};

const SPLIT_THRESHOLD_CM = 200;

function getReferencedColumnCount(snapshot: ShelfSnapshot): number {
  const referencedIndexes = [
    ...Object.keys(snapshot.columnHeights ?? {}),
    ...Object.keys(snapshot.columnHorizontalBoundaries ?? {}),
    ...Object.keys(snapshot.columnModuleBoundaries ?? {}),
    ...Object.keys(snapshot.columnTopModuleShelves ?? {}),
  ]
    .map((key) => Number(key))
    .filter(Number.isInteger);

  return referencedIndexes.length > 0
    ? Math.max(...referencedIndexes) + 1
    : 0;
}

function countValidShelves(
  shelves: number[] | null | undefined,
  minCm: number,
  maxCm: number,
): number {
  return (shelves ?? [])
    .map((shelfY) => shelfY * 100)
    .filter((shelfY) => shelfY > minCm && shelfY < maxCm)
    .sort((left, right) => left - right)
    .reduce((count, shelfY, index, shelfYs) => {
      const previousY = index === 0 ? minCm : shelfYs[index - 1];
      return shelfY > previousY + 0 ? count + 1 : count;
    }, 0);
}

export function computeShelfCount(snapshot: ShelfSnapshot | null | undefined) {
  if (!snapshot) {
    return 0;
  }

  const panelThicknessMm = Number(snapshot.panelThickness ?? 18);
  const tCm = panelThicknessMm / 10;
  const columnCount = Math.max(
    (snapshot.verticalBoundaries?.length ?? 0) + 1,
    getReferencedColumnCount(snapshot),
    1,
  );

  let shelfCount = 0;

  for (let colIdx = 0; colIdx < columnCount; colIdx++) {
    const colHeightCm = snapshot.columnHeights?.[colIdx] ?? snapshot.height ?? 0;
    const innerBottom = snapshot.hasBase ? Number(snapshot.baseHeight ?? 0) + tCm : tCm;
    const innerTop = colHeightCm - tCm;

    const rawModuleBoundary = snapshot.columnModuleBoundaries?.[colIdx];
    const moduleBoundaryCm =
      rawModuleBoundary !== null && rawModuleBoundary !== undefined
        ? rawModuleBoundary * 100
        : null;
    const hasValidModuleBoundary =
      moduleBoundaryCm !== null &&
      colHeightCm > SPLIT_THRESHOLD_CM &&
      moduleBoundaryCm > innerBottom + tCm &&
      moduleBoundaryCm < innerTop - tCm;

    shelfCount += countValidShelves(
      snapshot.columnHorizontalBoundaries?.[colIdx],
      innerBottom,
      hasValidModuleBoundary ? moduleBoundaryCm : innerTop,
    );

    if (hasValidModuleBoundary) {
      shelfCount += countValidShelves(
        snapshot.columnTopModuleShelves?.[colIdx],
        moduleBoundaryCm + tCm,
        innerTop,
      );
    }
  }

  return shelfCount;
}