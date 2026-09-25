/**
 * Upper bounds on a wardrobe snapshot before the server prices or stores it.
 *
 * Pricing loops over the counts inside a snapshot, so one crafted request
 * (e.g. `{"A1":{"columns":2000000000}}`) can pin a server instance. The
 * limits sit far above anything the configurator produces (4 columns,
 * 8 sections, 14 shelves, 11 drawers), so real designs never trip them.
 */

const MAX_DIMENSION_CM = 1000;
const MAX_BASE_HEIGHT_CM = 100;
const MAX_COLUMNS = 20;
const MAX_SHELVES_PER_COLUMN = 50;
const MAX_COMPARTMENTS = 400;
const MAX_SECTIONS = 20;
const MAX_PER_SECTION = 50;
const MAX_DOOR_GROUPS = 400;

const isRecord = (v: unknown): v is Record<string, unknown> =>
  typeof v === "object" && v !== null && !Array.isArray(v);

const finiteIn = (v: unknown, max: number) => {
  const n = typeof v === "string" ? Number(v) : v;
  return typeof n === "number" && Number.isFinite(n) && n >= 0 && n <= max;
};

// Stored arrays can hold null where the store padded a sparse index.
const numberList = (v: unknown, maxLength: number, max: number) =>
  Array.isArray(v) &&
  v.length <= maxLength &&
  v.every((n) => n === null || finiteIn(n, max));

const optional = (v: unknown, check: (v: unknown) => boolean) =>
  v === undefined || v === null || check(v);

const perColumn = (v: unknown, check: (value: unknown) => boolean) =>
  isRecord(v) &&
  Object.keys(v).length <= MAX_COLUMNS &&
  Object.values(v).every((value) => value === null || check(value));

/** Returns the first problem found, or null when the snapshot is in bounds. */
export function snapshotBoundsError(snapshot: unknown): string | null {
  if (!isRecord(snapshot)) return "snapshot";
  const s = snapshot;

  for (const key of ["width", "height", "depth"] as const) {
    if (!optional(s[key], (v) => finiteIn(v, MAX_DIMENSION_CM))) return key;
  }
  if (!optional(s.baseHeight, (v) => finiteIn(v, MAX_BASE_HEIGHT_CM)))
    return "baseHeight";

  // Seams are meters from the centre, so they can be negative.
  if (
    !optional(
      s.verticalBoundaries,
      (v) =>
        Array.isArray(v) &&
        v.length <= MAX_COLUMNS &&
        v.every((n) => typeof n === "number" && Number.isFinite(n)),
    )
  )
    return "verticalBoundaries";

  // Older saves hold a single shelf position instead of a list.
  const shelfList = (v: unknown) =>
    finiteIn(v, MAX_DIMENSION_CM) ||
    numberList(v, MAX_SHELVES_PER_COLUMN, MAX_DIMENSION_CM);
  if (!optional(s.columnHorizontalBoundaries, (v) => perColumn(v, shelfList)))
    return "columnHorizontalBoundaries";
  if (!optional(s.columnTopModuleShelves, (v) => perColumn(v, shelfList)))
    return "columnTopModuleShelves";
  const size = (v: unknown) => finiteIn(v, MAX_DIMENSION_CM);
  if (!optional(s.columnHeights, (v) => perColumn(v, size)))
    return "columnHeights";
  if (!optional(s.columnModuleBoundaries, (v) => perColumn(v, size)))
    return "columnModuleBoundaries";

  const configsOk = (v: unknown) =>
    isRecord(v) &&
    Object.keys(v).length <= MAX_COMPARTMENTS &&
    Object.values(v).every((cfg) => {
      if (!isRecord(cfg)) return false;
      const counts = (c: unknown) =>
        numberList(c, MAX_SECTIONS, MAX_PER_SECTION);
      return (
        optional(cfg.columns, (c) => finiteIn(c, MAX_SECTIONS)) &&
        optional(cfg.rowCounts, counts) &&
        optional(cfg.drawerCounts, counts) &&
        optional(
          cfg.sectionShelfRatios,
          (r) =>
            Array.isArray(r) &&
            r.length <= MAX_SECTIONS &&
            r.every((row) => numberList(row, MAX_PER_SECTION, 1)),
        )
      );
    });
  if (!optional(s.elementConfigs, configsOk)) return "elementConfigs";

  const extrasOk = (v: unknown) =>
    isRecord(v) &&
    Object.keys(v).length <= MAX_COMPARTMENTS &&
    Object.values(v).every(
      (e) =>
        isRecord(e) &&
        optional(e.drawersCount, (c) => finiteIn(c, MAX_PER_SECTION)),
    );
  if (!optional(s.compartmentExtras, extrasOk)) return "compartmentExtras";

  const doorsOk = (v: unknown) =>
    Array.isArray(v) &&
    v.length <= MAX_DOOR_GROUPS &&
    v.every(
      (g) =>
        isRecord(g) &&
        Array.isArray(g.compartments) &&
        g.compartments.length <= MAX_COMPARTMENTS,
    );
  if (!optional(s.doorGroups, doorsOk)) return "doorGroups";

  if (
    !optional(
      s.doorSelections,
      (v) => isRecord(v) && Object.keys(v).length <= MAX_COMPARTMENTS * 4,
    )
  )
    return "doorSelections";

  return null;
}
