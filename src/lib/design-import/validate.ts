/**
 * One place that answers "could a customer have built this by clicking?".
 *
 * The store actions trust their callers; most limits (dividers, drawers, rod,
 * door heights) live only in the UI panels that call them. Anything that
 * writes wardrobe state without going through those panels must pass this.
 */

import { getDoorSelectionBounds } from "@/lib/door-geometry";
import { isDrawerCountValid } from "@/lib/drawer-layout";
import { getValidCompartments } from "@/lib/reconcileWardrobeState";
import { type DoorGroup, parseSubCompKey, type ShelfState } from "@/lib/store";
import {
  DEFAULT_PANEL_THICKNESS_M,
  getMaxShelvesForHeight,
  MAX_DOOR_HEIGHT_CM,
  MAX_HORIZONTAL_SHELVES_INNER,
  MAX_MODULE_HEIGHT,
  MAX_SEGMENT_X_CM,
  MAX_VERTICAL_DIVIDERS,
  MIN_DIVIDER_WIDTH_CM,
  MIN_DOOR_HEIGHT_CM,
  MIN_DRAG_GAP,
  MIN_SHELF_HEIGHT_CM,
  MIN_TOP_HEIGHT,
  SLIDING_DOOR_MIN_COLUMNS,
  TARGET_BOTTOM_HEIGHT,
} from "@/lib/wardrobe-constants";
import { buildBlocksX, toLetters } from "@/lib/wardrobe-utils";

export const WIDTH_RANGE_CM = [50, 400] as const;
export const HEIGHT_RANGE_CM = [50, 280] as const;
export const DEPTH_RANGE_CM = [20, 100] as const;
export const BASE_HEIGHT_RANGE_CM = [3, 10] as const;
export const MIN_COLUMN_WIDTH_CM = 20;

const DOOR_TYPES = new Set([
  "left",
  "right",
  "double",
  "leftMirror",
  "rightMirror",
  "doubleMirror",
  "drawerStyle",
]);

/** Half a millimetre of slack so float noise never fails a real layout. */
const EPS_M = 0.0005;

export type WardrobeStateLike = Pick<
  ShelfState,
  | "width"
  | "height"
  | "depth"
  | "hasBase"
  | "baseHeight"
  | "verticalBoundaries"
  | "columnHorizontalBoundaries"
  | "columnHeights"
  | "columnModuleBoundaries"
  | "columnTopModuleShelves"
  | "elementConfigs"
  | "compartmentExtras"
  | "doorGroups"
  | "slidingDoors"
>;

export interface Violation {
  code: string;
  message: string;
}

const isNum = (v: unknown): v is number =>
  typeof v === "number" && Number.isFinite(v);

function checkClearGaps(
  ys: number[],
  floorY: number,
  ceilingY: number,
  t: number,
): boolean {
  let last = floorY;
  for (const y of ys) {
    if (y - t / 2 - last < MIN_DRAG_GAP - EPS_M) return false;
    last = y + t / 2;
  }
  return ys.length === 0 || ceilingY - last >= MIN_DRAG_GAP - EPS_M;
}

export function validateWardrobe(s: WardrobeStateLike): Violation[] {
  const out: Violation[] = [];
  const add = (code: string, message: string) => out.push({ code, message });
  const t = DEFAULT_PANEL_THICKNESS_M;

  const inRange = (v: number, [lo, hi]: readonly [number, number]) =>
    isNum(v) && v >= lo && v <= hi;
  if (!inRange(s.width, WIDTH_RANGE_CM)) add("width", `width ${s.width}`);
  if (!inRange(s.height, HEIGHT_RANGE_CM)) add("height", `height ${s.height}`);
  if (!inRange(s.depth, DEPTH_RANGE_CM)) add("depth", `depth ${s.depth}`);
  if (s.hasBase && !inRange(s.baseHeight, BASE_HEIGHT_RANGE_CM))
    add("base", `base height ${s.baseHeight}`);
  if (out.length > 0) return out; // geometry below is meaningless without sane dimensions

  // Structural columns: count follows width, each 20–120 cm.
  const widthM = s.width / 100;
  const columns = buildBlocksX(
    widthM,
    s.verticalBoundaries.length > 0 ? s.verticalBoundaries : undefined,
  );
  const expectedColumns = Math.max(1, Math.ceil(s.width / MAX_SEGMENT_X_CM));
  if (columns.length !== expectedColumns)
    add(
      "columns.count",
      `${columns.length} columns, width needs ${expectedColumns}`,
    );
  if (!s.verticalBoundaries.every(isNum))
    add("columns.seam", "non-numeric seam");

  const baseH = s.hasBase ? s.baseHeight / 100 : 0;
  const comps = getValidCompartments(s as never);

  columns.forEach((col, colIdx) => {
    const letter = toLetters(colIdx);
    const widthCm = Math.round(col.width * 100);
    const dividerMin = Math.max(
      MIN_COLUMN_WIDTH_CM,
      ...Object.entries(s.elementConfigs)
        .filter(([k]) => k.match(/^[A-Z]+/)?.[0] === letter)
        .map(([, cfg]) => (cfg.columns ?? 1) * MIN_DIVIDER_WIDTH_CM),
    );
    if (widthCm < dividerMin || widthCm > MAX_SEGMENT_X_CM)
      add("columns.width", `${letter} is ${widthCm} cm`);

    const colH = (s.columnHeights[colIdx] ?? s.height) / 100;
    const mbRaw = s.columnModuleBoundaries[colIdx];
    const split = colH > TARGET_BOTTOM_HEIGHT;
    if (split) {
      if (!isNum(mbRaw)) {
        add(
          "module.missing",
          `${letter} is over 200 cm without a module split`,
        );
        return;
      }
      const lo = Math.max(MIN_TOP_HEIGHT, colH - MAX_MODULE_HEIGHT);
      const hi = Math.min(colH - MIN_TOP_HEIGHT, MAX_MODULE_HEIGHT);
      if (mbRaw < lo - EPS_M || mbRaw > hi + EPS_M)
        add("module.range", `${letter} split at ${mbRaw}`);
    }
    const mb = split && isNum(mbRaw) ? mbRaw : null;

    const shelves = s.columnHorizontalBoundaries[colIdx] ?? [];
    if (!shelves.every(isNum))
      add("shelves.nan", `${letter} shelf is not a number`);
    const bottomTop = mb ?? colH;
    const maxBottom = getMaxShelvesForHeight(Math.round(bottomTop * 100));
    if (shelves.length > maxBottom)
      add("shelves.count", `${letter} has ${shelves.length}, max ${maxBottom}`);
    if (!checkClearGaps(shelves, baseH + t, bottomTop - t, t))
      add("shelves.gap", `${letter} shelves closer than 10 cm`);

    const topShelves =
      mb !== null ? (s.columnTopModuleShelves[colIdx] ?? []) : [];
    if (mb !== null) {
      if (!topShelves.every(isNum))
        add("topShelves.nan", `${letter} top shelf is not a number`);
      const maxTop = getMaxShelvesForHeight(Math.round((colH - mb) * 100));
      if (topShelves.length > maxTop)
        add(
          "topShelves.count",
          `${letter} top has ${topShelves.length}, max ${maxTop}`,
        );
      if (
        topShelves.some((y) => y < mb + 0.1 - EPS_M || y > colH - 0.1 + EPS_M)
      )
        add("topShelves.range", `${letter} top shelf outside the top module`);
      if (!checkClearGaps(topShelves, mb + t, colH - t, t))
        add("topShelves.gap", `${letter} top shelves closer than 10 cm`);
    }
  });

  // Per-compartment interiors.
  for (const [key, cfg] of Object.entries(s.elementConfigs)) {
    const comp = comps.get(key);
    if (!comp) {
      add("interior.orphan", `${key} does not exist`);
      continue;
    }
    const h = Math.round(comp.heightCm);
    const colIdx = key.charCodeAt(0) - 65;
    const widthCm = (columns[colIdx]?.width ?? 0) * 100;
    const sections = cfg.columns ?? 1;
    const maxSections = Math.min(
      MAX_VERTICAL_DIVIDERS + 1,
      Math.max(1, Math.floor(widthCm / MIN_DIVIDER_WIDTH_CM)),
    );
    if (!Number.isInteger(sections) || sections < 1 || sections > maxSections)
      add("dividers", `${key} has ${sections} sections, max ${maxSections}`);
    const maxInner = Math.max(
      0,
      Math.min(
        MAX_HORIZONTAL_SHELVES_INNER,
        Math.floor(h / MIN_SHELF_HEIGHT_CM) - 1,
      ),
    );
    (cfg.rowCounts ?? []).forEach((n, i) => {
      if (!Number.isInteger(n) || n < 0 || n > maxInner)
        add("innerShelves", `${key} section ${i} has ${n}, max ${maxInner}`);
    });
    (cfg.drawerCounts ?? []).forEach((n, i) => {
      if (!isNum(n) || n < 0) add("drawers.nan", `${key} section ${i}`);
      else if (n > 0 && !isDrawerCountValid(n, h, cfg.rowCounts?.[i] ?? 0))
        add("drawers", `${key} section ${i}: ${n} drawers in ${h} cm`);
    });
  }

  const isDivided = (key: string) => {
    const cfg = s.elementConfigs[key];
    return (
      !!cfg &&
      ((cfg.columns ?? 1) > 1 ||
        (cfg.rowCounts ?? []).some((c) => c > 0) ||
        (cfg.drawerCounts ?? []).some((c) => c > 0))
    );
  };
  for (const [key, extras] of Object.entries(s.compartmentExtras)) {
    if (!comps.has(key)) add("extras.orphan", `${key} does not exist`);
    else if ((extras.rod || extras.led) && isDivided(key))
      add("extras.divided", `${key} has a rod/LED but is subdivided`);
  }

  // Doors.
  if (s.slidingDoors) {
    if (columns.length < SLIDING_DOOR_MIN_COLUMNS)
      add("sliding.columns", "sliding doors need 2+ columns");
    if (s.doorGroups.length > 0)
      add("sliding.groups", "sliding doors with hinged doors");
  }
  const claimed = new Set<string>();
  for (const group of s.doorGroups as DoorGroup[]) {
    if (!DOOR_TYPES.has(group.type))
      add("doors.type", `${group.id}: ${group.type}`);
    const colIdx = group.column.charCodeAt(0) - 65;
    const col = columns[colIdx];
    if (!col) {
      add("doors.column", `${group.id} in missing column ${group.column}`);
      continue;
    }
    const colH = (s.columnHeights[colIdx] ?? s.height) / 100;
    const mb = s.columnModuleBoundaries[colIdx];
    const ctx = {
      columnLeft: col.start,
      columnRight: col.end,
      columnBottomY: 0,
      columnHeight: colH,
      baseHeight: baseH,
      panelThickness: t,
      columnShelfYs: s.columnHorizontalBoundaries[colIdx] ?? [],
      columnModuleBoundary:
        isNum(mb) && colH > TARGET_BOTTOM_HEIGHT ? mb : null,
      topModuleShelfYs: s.columnTopModuleShelves[colIdx] ?? [],
      elementConfigs: s.elementConfigs,
    };
    let totalCm = 0;
    for (const key of group.compartments) {
      const parsed = parseSubCompKey(key);
      if (
        !parsed ||
        parsed.column !== group.column ||
        !comps.has(parsed.compKey)
      ) {
        add("doors.key", `${group.id}: bad key ${key}`);
        continue;
      }
      if (claimed.has(key)) add("doors.overlap", `${key} in two door groups`);
      claimed.add(key);
      const cfg = s.elementConfigs[parsed.compKey];
      const external = (cfg?.drawerCounts ?? []).some(
        (n, i) => n > 0 && (cfg?.drawersExternal?.[i] ?? true),
      );
      if (external)
        add("doors.drawers", `${key} has external drawers behind a door`);
      const bounds = getDoorSelectionBounds(key, ctx);
      totalCm += bounds ? Math.round(bounds.height * 100) : 0;
    }
    if (totalCm < MIN_DOOR_HEIGHT_CM || totalCm > MAX_DOOR_HEIGHT_CM)
      add("doors.height", `${group.id} is ${totalCm} cm`);
  }

  return out;
}
