/**
 * The loose wardrobe description an image/sketch reader produces.
 *
 * Everything except `recognized` is optional: a rough sketch with no numbers
 * still yields a usable draft, and the planner fills every gap with defaults.
 * Heights are fractions of the drawn outline (0 = floor, 1 = top) because a
 * sketch has no scale; widths are ratios between sections for the same reason.
 */

export const DRAFT_DOOR_TYPES = [
  "none",
  "left",
  "right",
  "double",
  "leftMirror",
  "rightMirror",
  "doubleMirror",
] as const;

export type DraftDoorType = (typeof DRAFT_DOOR_TYPES)[number];

export interface DraftSection {
  /** Width relative to the other sections (any positive scale). */
  widthRatio?: number;
  /** Full-width lines inside this section, as fractions of total height. */
  shelves?: number[];
  /** Drawers stacked at the bottom of this section. */
  drawers?: number;
  /** Hanging rail somewhere in this section. */
  rod?: boolean;
  /** Where the rail is drawn, as a fraction of total height. */
  rodHeight?: number;
  door?: DraftDoorType;
}

export interface WardrobeDraft {
  recognized: boolean;
  widthCm?: number;
  heightCm?: number;
  depthCm?: number;
  /** Drawn outline width ÷ height, used only when no width is known. */
  aspectRatio?: number;
  base?: boolean;
  slidingDoors?: boolean;
  /** Vertical sections left to right, as drawn. */
  sections: DraftSection[];
}

const MAX_DRAFT_SECTIONS = 12;
const MAX_DRAFT_SHELVES = 40;

function toNumber(value: unknown): number | undefined {
  if (typeof value === "number")
    return Number.isFinite(value) ? value : undefined;
  if (typeof value === "string" && value.trim() !== "") {
    const parsed = Number(value.trim().replace(",", "."));
    return Number.isFinite(parsed) ? parsed : undefined;
  }
  return undefined;
}

function toBoolean(value: unknown): boolean | undefined {
  if (typeof value === "boolean") return value;
  if (value === "true") return true;
  if (value === "false") return false;
  return undefined;
}

function toFraction(value: unknown): number | undefined {
  const n = toNumber(value);
  return n !== undefined && n > 0 && n < 1 ? n : undefined;
}

function toPositive(value: unknown): number | undefined {
  const n = toNumber(value);
  return n !== undefined && n > 0 ? n : undefined;
}

function toDoorType(value: unknown): DraftDoorType | undefined {
  return typeof value === "string" &&
    (DRAFT_DOOR_TYPES as readonly string[]).includes(value)
    ? (value as DraftDoorType)
    : undefined;
}

function parseSection(raw: unknown): DraftSection {
  if (!raw || typeof raw !== "object") return {};
  const r = raw as Record<string, unknown>;
  const shelves = Array.isArray(r.shelves)
    ? r.shelves
        .slice(0, MAX_DRAFT_SHELVES)
        .map(toFraction)
        .filter((v): v is number => v !== undefined)
    : undefined;
  const drawers = toNumber(r.drawers);
  return {
    widthRatio: toPositive(r.widthRatio),
    shelves,
    drawers:
      drawers !== undefined && drawers > 0 ? Math.floor(drawers) : undefined,
    rod: toBoolean(r.rod),
    rodHeight: toFraction(r.rodHeight),
    door: toDoorType(r.door),
  };
}

/**
 * Turns anything (model output, a hand-written test case, garbage) into a
 * draft. Never throws: unreadable fields are dropped one by one, so a single
 * bad value cannot discard the rest of the drawing.
 */
export function parseDraft(raw: unknown): WardrobeDraft {
  if (!raw || typeof raw !== "object")
    return { recognized: false, sections: [] };
  const r = raw as Record<string, unknown>;
  const sections = Array.isArray(r.sections)
    ? r.sections.slice(0, MAX_DRAFT_SECTIONS).map(parseSection)
    : [];
  return {
    recognized: toBoolean(r.recognized) ?? sections.length > 0,
    widthCm: toPositive(r.widthCm),
    heightCm: toPositive(r.heightCm),
    depthCm: toPositive(r.depthCm),
    aspectRatio: toPositive(r.aspectRatio),
    base: toBoolean(r.base),
    slidingDoors: toBoolean(r.slidingDoors),
    sections,
  };
}
