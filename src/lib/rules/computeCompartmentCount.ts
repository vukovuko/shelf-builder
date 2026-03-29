import { getCompartmentsForColumn } from "../blueprintHelpers";

type CompartmentSnapshot = {
  height?: number;
  hasBase?: boolean;
  baseHeight?: number;
  panelThickness?: number;
  verticalBoundaries?: number[];
  columnHeights?: Record<number, number>;
  columnHorizontalBoundaries?: Record<number, number[]>;
  columnModuleBoundaries?: Record<number, number | null>;
  columnTopModuleShelves?: Record<number, number[]>;
};

function getReferencedColumnCount(snapshot: CompartmentSnapshot): number {
  const referencedIndexes = [
    ...Object.keys(snapshot.columnHeights ?? {}),
    ...Object.keys(snapshot.columnHorizontalBoundaries ?? {}),
    ...Object.keys(snapshot.columnModuleBoundaries ?? {}),
    ...Object.keys(snapshot.columnTopModuleShelves ?? {}),
  ]
    .map((key) => Number(key))
    .filter(Number.isInteger);

  return referencedIndexes.length > 0 ? Math.max(...referencedIndexes) + 1 : 0;
}

export function computeCompartmentCount(
  snapshot: CompartmentSnapshot | null | undefined,
): number {
  if (!snapshot) {
    return 0;
  }

  const columnCount = Math.max(
    (snapshot.verticalBoundaries?.length ?? 0) + 1,
    getReferencedColumnCount(snapshot),
    1,
  );
  const panelThickness = Number(snapshot.panelThickness ?? 18);
  const tCm = panelThickness / 10;

  let compartmentCount = 0;
  for (let colIdx = 0; colIdx < columnCount; colIdx++) {
    compartmentCount += getCompartmentsForColumn({
      colIdx,
      columnHeights: snapshot.columnHeights ?? {},
      height: Number(snapshot.height ?? 0),
      columnHorizontalBoundaries: snapshot.columnHorizontalBoundaries ?? {},
      columnModuleBoundaries: snapshot.columnModuleBoundaries ?? {},
      columnTopModuleShelves: snapshot.columnTopModuleShelves ?? {},
      hasBase: Boolean(snapshot.hasBase),
      baseHeight: Number(snapshot.baseHeight ?? 0),
      tCm,
    }).length;
  }

  return compartmentCount;
}
