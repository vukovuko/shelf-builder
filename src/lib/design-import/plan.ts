/**
 * Turns a loose draft into a concrete wardrobe plan that already respects
 * every configurator rule. Pure: no store access. Each field falls back on
 * its own — a value that is present and valid is kept, one that breaks a
 * rule is snapped to the nearest allowed value, one that is missing gets a
 * default — so a partial drawing still yields a complete wardrobe.
 */

import { normalizeDrawerCount } from "@/lib/drawer-layout";
import type { DoorOption } from "@/lib/store";
import {
  DEFAULT_PANEL_THICKNESS_M,
  getMaxShelvesForHeight,
  MAX_DOOR_HEIGHT_CM,
  MAX_DRAWER_HEIGHT_CM,
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
import type { DraftDoorType, DraftSection, WardrobeDraft } from "./draft";
import { distributeWidths, fitShelves, groupSections } from "./fit";
import {
  BASE_HEIGHT_RANGE_CM,
  DEPTH_RANGE_CM,
  HEIGHT_RANGE_CM,
  MIN_COLUMN_WIDTH_CM,
  WIDTH_RANGE_CM,
} from "./validate";

const T = DEFAULT_PANEL_THICKNESS_M;
const DEFAULT_WIDTH_CM = 210;
const DEFAULT_HEIGHT_CM = 240;
const DEFAULT_DEPTH_CM = 60;
/** Typical width per section when a sketch with 3+ sections has no width. */
const WIDTH_PER_SECTION_CM = 85;
/** A drawn aspect ratio overrides the default width only when clearly different. */
const RATIO_TRUST = 0.25;
/** Target drawer front height; stays inside the 10–40 cm slot rule. */
const DRAWER_SLOT_CM = 20;
/** A drawn line this close to the 200 cm module split is that split. */
const MODULE_SNAP_M = 0.15;
/** Lines this close (fraction of height) in every section count as one shelf. */
const SHARED_LINE_TOLERANCE = 0.05;

export interface Adjustment {
  code: string;
  message: string;
}

export interface PlannedCompartment {
  sections: number;
  rowCounts: number[];
  drawerCounts: number[];
  rod: boolean;
}

export interface PlannedDoor {
  type: DoorOption;
  /** 1-based compartment numbers within the column, bottom to top. */
  from: number;
  to: number;
}

export interface PlannedColumn {
  widthCm: number;
  /** Module joint, meters from the floor; null at 200 cm or lower. */
  moduleSplit: number | null;
  /** Bottom-module shelf centres, meters from the floor. */
  shelves: number[];
  topShelfCount: number;
  compartments: Record<number, PlannedCompartment>;
  doors: PlannedDoor[];
}

export interface WardrobePlan {
  widthCm: number;
  heightCm: number;
  depthCm: number;
  hasBase: boolean;
  baseHeightCm: number;
  columns: PlannedColumn[];
  slidingDoors: boolean;
}

export interface DimensionOverrides {
  widthCm?: number;
  heightCm?: number;
  depthCm?: number;
}

export type PlanResult =
  | { status: "empty"; adjustments: Adjustment[] }
  | {
      status: "ok" | "adjusted";
      plan: WardrobePlan;
      adjustments: Adjustment[];
    };

type Section = DraftSection & { widthRatio: number };

const clamp = (v: number, lo: number, hi: number) =>
  Math.min(hi, Math.max(lo, v));

function pickDimension(
  given: number | undefined,
  fallback: number,
  range: readonly [number, number],
  label: string,
  adjustments: Adjustment[],
): number {
  if (given === undefined) return fallback;
  const value = Math.round(clamp(given, range[0], range[1]));
  if (value !== Math.round(given)) {
    adjustments.push({
      code: `${label}.clamped`,
      message: `Mera ${Math.round(given)} cm nije moguća, postavljeno je ${value} cm.`,
    });
  }
  return value;
}

function pickWidth(
  draft: WardrobeDraft,
  overrides: DimensionOverrides,
  heightCm: number,
  adjustments: Adjustment[],
): number {
  const given = overrides.widthCm ?? draft.widthCm;
  if (given !== undefined)
    return pickDimension(
      given,
      DEFAULT_WIDTH_CM,
      WIDTH_RANGE_CM,
      "width",
      adjustments,
    );
  const k = draft.sections.length;
  const expected =
    k <= 2
      ? DEFAULT_WIDTH_CM
      : Math.min(WIDTH_RANGE_CM[1], k * WIDTH_PER_SECTION_CM);
  const fromRatio = draft.aspectRatio
    ? Math.round((draft.aspectRatio * heightCm) / 10) * 10
    : null;
  const guess =
    fromRatio !== null &&
    Math.abs(fromRatio - expected) / expected > RATIO_TRUST
      ? clamp(fromRatio, WIDTH_RANGE_CM[0], WIDTH_RANGE_CM[1])
      : expected;
  return fitWidthToSections(guess, k);
}

/**
 * An estimated width is only a guess, the drawn sections are not: pick the
 * nearest width whose column count (one per 120 cm) equals the number of
 * sections, so 4 drawn compartments become 4 columns rather than 3 columns
 * plus an inner divider. Only for 2–4 sections; 400 cm fits at most 4.
 */
function fitWidthToSections(widthCm: number, sections: number): number {
  const maxColumns = Math.ceil(WIDTH_RANGE_CM[1] / MAX_SEGMENT_X_CM);
  if (sections < 2 || sections > maxColumns) return widthCm;
  const lo = Math.ceil(((sections - 1) * MAX_SEGMENT_X_CM + 1) / 10) * 10;
  const hi = Math.min(WIDTH_RANGE_CM[1], sections * MAX_SEGMENT_X_CM);
  return clamp(widthCm, lo, hi);
}

/** Splits a section in two halves; a double door becomes one leaf each. */
function splitSection(s: Section): [Section, Section] {
  const half = { ...s, widthRatio: s.widthRatio / 2 };
  const leaves: Partial<Record<DraftDoorType, [DraftDoorType, DraftDoorType]>> =
    {
      double: ["left", "right"],
      doubleMirror: ["leftMirror", "rightMirror"],
    };
  const pair = s.door ? leaves[s.door] : undefined;
  return pair
    ? [
        { ...half, door: pair[0] },
        { ...half, door: pair[1] },
      ]
    : [half, { ...half }];
}

/** Merges adjacent sections down to `count`, keeping the first one's layout per chunk. */
function mergeSections(sections: Section[], count: number): Section[] {
  const sizes = groupSections(
    sections.map((s) => s.widthRatio),
    count,
  );
  const merged: Section[] = [];
  let pos = 0;
  for (const size of sizes) {
    const chunk = sections.slice(pos, pos + size);
    merged.push({
      ...chunk[0],
      widthRatio: chunk.reduce((sum, s) => sum + s.widthRatio, 0),
      drawers: Math.max(0, ...chunk.map((s) => s.drawers ?? 0)) || undefined,
    });
    pos += size;
  }
  return merged;
}

function columnDoorType(sections: Section[]): DoorOption | null {
  const withDoor = sections.filter((s) => s.door && s.door !== "none");
  if (withDoor.length === 0) return null;
  if (sections.length === 1) return sections[0].door as DoorOption;
  return withDoor.some((s) => s.door?.includes("Mirror"))
    ? "doubleMirror"
    : "double";
}

export function planWardrobe(
  draft: WardrobeDraft,
  overrides: DimensionOverrides = {},
): PlanResult {
  const adjustments: Adjustment[] = [];
  if (!draft.recognized) return { status: "empty", adjustments };

  const heightCm = pickDimension(
    overrides.heightCm ?? draft.heightCm,
    DEFAULT_HEIGHT_CM,
    HEIGHT_RANGE_CM,
    "height",
    adjustments,
  );
  const depthCm = pickDimension(
    overrides.depthCm ?? draft.depthCm,
    DEFAULT_DEPTH_CM,
    DEPTH_RANGE_CM,
    "depth",
    adjustments,
  );
  const widthCm = pickWidth(draft, overrides, heightCm, adjustments);
  const hasBase = draft.base === true;
  const baseHeightCm = BASE_HEIGHT_RANGE_CM[0];
  const columnCount = Math.max(1, Math.ceil(widthCm / MAX_SEGMENT_X_CM));

  // Sections → structural columns. Column count is fixed by width, so extra
  // sections become inner dividers and missing ones come from splitting.
  const sections: Section[] =
    draft.sections.length === 0
      ? Array.from({ length: columnCount }, () => ({ widthRatio: 1 }))
      : draft.sections.map((s) => ({ ...s, widthRatio: s.widthRatio ?? 1 }));
  if (sections.length < columnCount && draft.sections.length > 0) {
    adjustments.push({
      code: "columns.split",
      message: `Orman širine ${widthCm} cm mora imati ${columnCount} kolone (najviše ${MAX_SEGMENT_X_CM} cm po koloni).`,
    });
  }
  while (sections.length < columnCount) {
    const widest = sections.reduce(
      (best, s, i) => (s.widthRatio > sections[best].widthRatio ? i : best),
      0,
    );
    sections.splice(widest, 1, ...splitSection(sections[widest]));
  }

  let groups: Section[][];
  if (sections.length > columnCount) {
    const sizes = groupSections(
      sections.map((s) => s.widthRatio),
      columnCount,
      MAX_SEGMENT_X_CM / widthCm,
    );
    groups = [];
    let pos = 0;
    for (const size of sizes) {
      groups.push(sections.slice(pos, pos + size));
      pos += size;
    }
    adjustments.push({
      code: "columns.merged",
      message: `Orman širine ${widthCm} cm ima ${columnCount} kolone, pa su ostale pregrade unutrašnje.`,
    });
  } else {
    groups = sections.map((s) => [s]);
  }

  const groupRatio = (g: Section[]) =>
    g.reduce((sum, s) => sum + s.widthRatio, 0);
  const firstPass = distributeWidths(
    groups.map(groupRatio),
    widthCm,
    MIN_COLUMN_WIDTH_CM,
    MAX_SEGMENT_X_CM,
  );
  groups = groups.map((g, i) => {
    const maxSections = Math.min(
      MAX_VERTICAL_DIVIDERS + 1,
      Math.max(1, Math.floor(firstPass[i] / MIN_DIVIDER_WIDTH_CM)),
    );
    if (g.length <= maxSections) return g;
    adjustments.push({
      code: "dividers.reduced",
      message: `Kolona ${String.fromCharCode(65 + i)} ima ${maxSections} pregrade umesto ${g.length} (najmanje ${MIN_DIVIDER_WIDTH_CM} cm po pregradi).`,
    });
    return mergeSections(g, maxSections);
  });
  const widths = distributeWidths(
    groups.map(groupRatio),
    widthCm,
    groups.map((g) =>
      Math.max(MIN_COLUMN_WIDTH_CM, g.length * MIN_DIVIDER_WIDTH_CM),
    ),
    MAX_SEGMENT_X_CM,
  );

  // Over 200 cm every column is two stacked modules. The joint defaults to
  // 200 cm but may sit anywhere that keeps both modules within 200 cm, so a
  // line drawn across the column becomes the joint rather than the joint
  // adding a line the drawing doesn't have (a 2×2 sketch stays 2×2).
  const heightM = heightCm / 100;
  const splitRange =
    heightM > TARGET_BOTTOM_HEIGHT
      ? {
          lo: Math.max(MIN_TOP_HEIGHT, heightM - MAX_MODULE_HEIGHT),
          hi: Math.min(MAX_MODULE_HEIGHT, heightM - MIN_TOP_HEIGHT),
        }
      : null;
  const pickModuleSplit = (lines: number[]): number | null => {
    if (splitRange === null) return null;
    const standard = splitRange.hi;
    if (lines.some((y) => Math.abs(y - standard) <= MODULE_SNAP_M))
      return standard;
    const drawn = lines.filter((y) => y >= splitRange.lo && y <= standard);
    return drawn.length === 0
      ? standard
      : drawn.reduce((best, y) =>
          Math.abs(y - standard) < Math.abs(best - standard) ? y : best,
        );
  };
  const baseM = hasBase ? baseHeightCm / 100 : 0;
  const floorY = baseM + T;
  const pitch = MIN_DRAG_GAP + T;

  const columns: PlannedColumn[] = groups.map((group, colIdx) => {
    const letter = String.fromCharCode(65 + colIdx);
    const m = group.length;

    const lineYs = (s: Section) => (s.shelves ?? []).map((f) => f * heightM);

    // In a divided column only lines drawn across every section are shelves
    // of the column itself; the rest belong to one section.
    const tol = SHARED_LINE_TOLERANCE * heightM;
    let columnLines: number[];
    let sectionLines: number[][];
    if (m === 1) {
      columnLines = lineYs(group[0]);
      sectionLines = [[]];
    } else {
      const all = group.map(lineYs);
      columnLines = all[0].filter((y) =>
        all.every((ys) => ys.some((other) => Math.abs(other - y) <= tol)),
      );
      sectionLines = all.map((ys) =>
        ys.filter((y) => !columnLines.some((c) => Math.abs(c - y) <= tol)),
      );
    }

    const moduleSplit = pickModuleSplit(columnLines);
    // Lines near the standard joint merge into it; a drawn joint is only itself.
    const absorb =
      moduleSplit !== null && moduleSplit === splitRange?.hi
        ? MODULE_SNAP_M
        : 0;
    const bottomOf = (ys: number[]) =>
      moduleSplit === null ? ys : ys.filter((y) => y < moduleSplit - absorb);
    const topOf = (ys: number[]) =>
      moduleSplit === null ? [] : ys.filter((y) => y > moduleSplit + absorb);
    const bottomTop = moduleSplit ?? heightM;
    const ceilingY = bottomTop - T;
    const maxBottomShelves = getMaxShelvesForHeight(
      Math.round(bottomTop * 100),
    );
    const topHeightM = moduleSplit !== null ? heightM - moduleSplit : 0;
    const maxTopShelves =
      moduleSplit !== null
        ? getMaxShelvesForHeight(Math.round(topHeightM * 100))
        : 0;

    // Drawers get their own bottom compartment sized to the stack.
    let drawerCounts = group.map((s) => s.drawers ?? 0);
    const availableCm = (ceilingY - floorY) * 100;
    const drawerCap = Math.min(
      MAX_HORIZONTAL_SHELVES_INNER + 1,
      Math.floor(availableCm / MIN_SHELF_HEIGHT_CM),
    );
    if (drawerCounts.some((n) => n > drawerCap)) {
      adjustments.push({
        code: "drawers.reduced",
        message: `Kolona ${letter} može imati najviše ${drawerCap} fioka.`,
      });
      drawerCounts = drawerCounts.map((n) => Math.min(n, drawerCap));
    }
    const stack = Math.max(0, ...drawerCounts);
    let drawerShelf: number | null = null;
    let drawerOnly = false;
    if (stack > 0) {
      const stackCm = DRAWER_SLOT_CM * stack;
      if (availableCm - stackCm < pitch * 100 + 1) drawerOnly = true;
      else drawerShelf = floorY + stackCm / 100;
    }

    const wantedBottom = bottomOf(columnLines);
    let shelves: number[];
    if (drawerOnly) {
      shelves = [];
    } else if (drawerShelf !== null) {
      const above = wantedBottom.filter((y) => y > drawerShelf + pitch / 2);
      shelves = [
        drawerShelf,
        ...fitShelves(
          above,
          drawerShelf + T / 2,
          ceilingY,
          T,
          MIN_DRAG_GAP,
          maxBottomShelves - 1,
        ),
      ];
      if (shelves.length - 1 < above.length) {
        adjustments.push({
          code: "shelves.reduced",
          message: `Kolona ${letter} ima ${shelves.length - 1} polica umesto ${above.length} (najmanje 10 cm razmaka).`,
        });
      }
    } else {
      shelves = fitShelves(
        wantedBottom,
        floorY,
        ceilingY,
        T,
        MIN_DRAG_GAP,
        maxBottomShelves,
      );
      if (shelves.length < wantedBottom.length) {
        adjustments.push({
          code: "shelves.reduced",
          message: `Kolona ${letter} ima ${shelves.length} polica umesto ${wantedBottom.length} (najmanje 10 cm razmaka).`,
        });
      }
    }

    const wantedTop = topOf(columnLines).length;
    const topShelfCount = Math.min(wantedTop, maxTopShelves);
    if (topShelfCount < wantedTop) {
      adjustments.push({
        code: "topShelves.reduced",
        message: `Gornji deo kolone ${letter} ima ${topShelfCount} polica umesto ${wantedTop}.`,
      });
    }

    // Compartment bounds in the same terms the store uses (shelf centrelines).
    const bottomYs = [floorY, ...shelves, ceilingY];
    const topYs =
      moduleSplit !== null
        ? [
            moduleSplit + T,
            ...Array.from(
              { length: topShelfCount },
              (_, i) =>
                moduleSplit +
                T +
                ((i + 1) * (topHeightM - 2 * T)) / (topShelfCount + 1),
            ),
            heightM - T,
          ]
        : [];
    const bounds: { from: number; to: number }[] = [];
    for (let i = 0; i < bottomYs.length - 1; i++)
      bounds.push({ from: bottomYs[i], to: bottomYs[i + 1] });
    const bottomCount = bounds.length;
    for (let i = 0; i < topYs.length - 1; i++)
      bounds.push({ from: topYs[i], to: topYs[i + 1] });
    const heightCmOf = (idx: number) =>
      Math.round((bounds[idx].to - bounds[idx].from) * 100);
    const maxInner = (h: number) =>
      Math.max(
        0,
        Math.min(
          MAX_HORIZONTAL_SHELVES_INNER,
          Math.floor(h / MIN_SHELF_HEIGHT_CM) - 1,
        ),
      );

    const compartments: Record<number, PlannedCompartment> = {};
    const compartmentAt = (idx: number) => {
      compartments[idx + 1] ??= {
        sections: m,
        rowCounts: Array(m).fill(0),
        drawerCounts: Array(m).fill(0),
        rod: false,
      };
      return compartments[idx + 1];
    };
    if (m > 1) {
      for (let idx = 0; idx < bounds.length; idx++) compartmentAt(idx);
    }

    // Lines that belong to a single section become inner shelves.
    if (m > 1) {
      let reduced = false;
      sectionLines.forEach((ys, s) => {
        bounds.forEach((b, idx) => {
          if (stack > 0 && idx === 0) return; // drawer fronts, not shelves
          const inside = ys.filter((y) => y > b.from && y < b.to).length;
          if (inside === 0) return;
          const allowed = Math.min(inside, maxInner(heightCmOf(idx)));
          if (allowed < inside) reduced = true;
          compartmentAt(idx).rowCounts[s] = allowed;
        });
      });
      if (reduced) {
        adjustments.push({
          code: "innerShelves.reduced",
          message: `Neke police u koloni ${letter} su izostavljene (najmanje ${MIN_SHELF_HEIGHT_CM} cm po polici).`,
        });
      }
    }

    // Drawer compartment: N drawers need N−1 inner shelves and 10–40 cm slots.
    if (stack > 0) {
      const h = heightCmOf(0);
      let reduced = false;
      drawerCounts.forEach((n, s) => {
        if (n === 0) return;
        const rows = Math.min(
          maxInner(h),
          Math.max(n - 1, Math.ceil(h / MAX_DRAWER_HEIGHT_CM) - 1),
        );
        const fitted = normalizeDrawerCount(n, h, rows);
        if (fitted < n) reduced = true;
        if (fitted === 0) return;
        const comp = compartmentAt(0);
        comp.rowCounts[s] = rows;
        comp.drawerCounts[s] = fitted;
      });
      if (reduced) {
        adjustments.push({
          code: "drawers.reduced",
          message: `Broj fioka u koloni ${letter} je prilagođen visini (fioka 10–40 cm).`,
        });
      }
    }

    // Rod: only in a compartment with no dividers, shelves or drawers.
    group.forEach((s) => {
      if (!s.rod) return;
      if (m > 1) {
        adjustments.push({
          code: "rod.dropped",
          message: `Šipka za ofingere ne može u pregrađenu kolonu ${letter}.`,
        });
        return;
      }
      const clean = bounds
        .map((b, idx) => ({ b, idx }))
        .filter(({ idx }) => !compartments[idx + 1]);
      if (clean.length === 0) {
        adjustments.push({
          code: "rod.dropped",
          message: `U koloni ${letter} nema slobodnog dela za šipku.`,
        });
        return;
      }
      const rodY = s.rodHeight !== undefined ? s.rodHeight * heightM : null;
      const drawnAt =
        rodY !== null
          ? clean.find(({ b }) => rodY > b.from && rodY < b.to)
          : undefined;
      const tallest = clean
        .filter(({ idx }) => idx < bottomCount)
        .sort((a, b) => heightCmOf(b.idx) - heightCmOf(a.idx))[0];
      compartmentAt((drawnAt ?? tallest ?? clean[0]).idx).rod = true;
    });

    // Doors: one group over the bottom module above the drawers, one over the top.
    const doors: PlannedDoor[] = [];
    const type = columnDoorType(group);
    if (type) {
      const runs: { from: number; to: number }[] = [];
      const firstDoorComp = stack > 0 ? 2 : 1;
      if (firstDoorComp <= bottomCount)
        runs.push({ from: firstDoorComp, to: bottomCount });
      if (bounds.length > bottomCount)
        runs.push({ from: bottomCount + 1, to: bounds.length });
      for (const run of runs) {
        const spanCm =
          (bounds[run.to - 1].to - bounds[run.from - 1].from) * 100;
        if (spanCm < MIN_DOOR_HEIGHT_CM || spanCm > MAX_DOOR_HEIGHT_CM) {
          adjustments.push({
            code: "doors.dropped",
            message: `Vrata na koloni ${letter} bi bila ${Math.round(spanCm)} cm, a moraju biti ${MIN_DOOR_HEIGHT_CM}–${MAX_DOOR_HEIGHT_CM} cm.`,
          });
          continue;
        }
        doors.push({ type, ...run });
      }
    }

    return {
      widthCm: widths[colIdx],
      moduleSplit,
      shelves,
      topShelfCount,
      compartments,
      doors,
    };
  });

  let slidingDoors = false;
  if (draft.slidingDoors) {
    if (columns.length >= SLIDING_DOOR_MIN_COLUMNS) {
      slidingDoors = true;
      for (const c of columns) c.doors = [];
    } else {
      adjustments.push({
        code: "sliding.dropped",
        message: `Klizna vrata traže najmanje ${SLIDING_DOOR_MIN_COLUMNS} kolone.`,
      });
    }
  }

  return {
    status: adjustments.length > 0 ? "adjusted" : "ok",
    plan: {
      widthCm,
      heightCm,
      depthCm,
      hasBase,
      baseHeightCm,
      columns,
      slidingDoors,
    },
    adjustments,
  };
}
