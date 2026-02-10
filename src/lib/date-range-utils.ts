import {
  startOfDay,
  endOfDay,
  subDays,
  subMonths,
  startOfMonth,
  differenceInCalendarDays,
  format,
  parseISO,
  isValid,
} from "date-fns";

export interface DateRange {
  from: Date;
  to: Date;
}

export type PresetKey =
  | "today"
  | "yesterday"
  | "last7"
  | "last30"
  | "last90"
  | "last365"
  | "last12m";

export interface PresetOption {
  key: PresetKey;
  label: string;
}

export const PRESETS: PresetOption[] = [
  { key: "today", label: "Danas" },
  { key: "yesterday", label: "Juče" },
  { key: "last7", label: "Poslednjih 7 dana" },
  { key: "last30", label: "Poslednjih 30 dana" },
  { key: "last90", label: "Poslednjih 90 dana" },
  { key: "last365", label: "Poslednjih 365 dana" },
  { key: "last12m", label: "Poslednjih 12 meseci" },
];

/** Resolve a preset key to a concrete DateRange */
export function resolvePreset(key: PresetKey): DateRange {
  const now = new Date();
  const todayStart = startOfDay(now);
  const todayEnd = endOfDay(now);

  switch (key) {
    case "today":
      return { from: todayStart, to: todayEnd };
    case "yesterday": {
      const y = subDays(todayStart, 1);
      return { from: y, to: endOfDay(y) };
    }
    case "last7":
      return { from: startOfDay(subDays(now, 6)), to: todayEnd };
    case "last30":
      return { from: startOfDay(subDays(now, 29)), to: todayEnd };
    case "last90":
      return { from: startOfDay(subDays(now, 89)), to: todayEnd };
    case "last365":
      return { from: startOfDay(subDays(now, 364)), to: todayEnd };
    case "last12m":
      return { from: startOfMonth(subMonths(now, 11)), to: todayEnd };
  }
}

/** Compute the "previous period" of equal length immediately before `from` */
export function computePreviousPeriod(range: DateRange): DateRange {
  const days = differenceInCalendarDays(range.to, range.from) + 1;
  const prevTo = endOfDay(subDays(range.from, 1));
  const prevFrom = startOfDay(subDays(range.from, days));
  return { from: prevFrom, to: prevTo };
}

/** Parse URL search params into a DateRange, falling back to last30 */
export function parseDateRangeParams(params: {
  from?: string;
  to?: string;
  preset?: string;
}): { range: DateRange; presetKey: PresetKey | null } {
  if (params.preset && PRESETS.some((p) => p.key === params.preset)) {
    const key = params.preset as PresetKey;
    return { range: resolvePreset(key), presetKey: key };
  }

  if (params.from && params.to) {
    const from = parseISO(params.from);
    const to = parseISO(params.to);
    if (isValid(from) && isValid(to) && from <= to) {
      return {
        range: { from: startOfDay(from), to: endOfDay(to) },
        presetKey: null,
      };
    }
  }

  return { range: resolvePreset("last30"), presetKey: "last30" };
}

/** Format a DateRange for the trigger button (e.g. "Dec 11, 2025 – Jan 10, 2026") */
export function formatRangeLabel(range: DateRange): string {
  return `${format(range.from, "MMM d, yyyy")} – ${format(range.to, "MMM d, yyyy")}`;
}

/** Convert DateRange to URL search params string */
export function rangeToSearchParams(
  presetKey: PresetKey | null,
  range?: DateRange,
): string {
  if (presetKey) return `preset=${presetKey}`;
  if (range)
    return `from=${format(range.from, "yyyy-MM-dd")}&to=${format(range.to, "yyyy-MM-dd")}`;
  return "preset=last30";
}
