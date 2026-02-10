"use client";

import * as React from "react";
import { useRouter, usePathname } from "next/navigation";
import { CalendarIcon, Check } from "lucide-react";
import { format, subDays } from "date-fns";
import { sr } from "date-fns/locale";
import type { DateRange as DayPickerRange } from "react-day-picker";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import {
  PRESETS,
  type PresetKey,
  type DateRange,
  resolvePreset,
  rangeToSearchParams,
  formatRangeLabel,
} from "@/lib/date-range-utils";

type Tab = "fixed" | "rolling";
type RollingUnit = "days" | "weeks" | "months";

interface DateRangePickerProps {
  currentRange: DateRange;
  currentPreset: PresetKey | null;
}

export function DateRangePicker({
  currentRange,
  currentPreset,
}: DateRangePickerProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [open, setOpen] = React.useState(false);

  // --- Tab state ---
  const [tab, setTab] = React.useState<Tab>(
    currentPreset ? "rolling" : "fixed",
  );

  // --- Fixed tab state (custom date range) ---
  const [fixedRange, setFixedRange] = React.useState<
    DayPickerRange | undefined
  >({
    from: currentRange.from,
    to: currentRange.to,
  });

  // --- Rolling tab state ---
  const [rollingAmount, setRollingAmount] = React.useState(30);
  const [rollingUnit, setRollingUnit] = React.useState<RollingUnit>("days");

  // --- Preset highlight ---
  const [selectedPreset, setSelectedPreset] = React.useState<PresetKey | null>(
    currentPreset,
  );

  // Reset state when popover opens
  React.useEffect(() => {
    if (open) {
      setTab(currentPreset ? "rolling" : "fixed");
      setFixedRange({ from: currentRange.from, to: currentRange.to });
      setSelectedPreset(currentPreset);
      setRollingAmount(30);
      setRollingUnit("days");
    }
  }, [open, currentPreset, currentRange.from, currentRange.to]);

  // Compute the rolling preview range
  const rollingRange = React.useMemo((): DateRange => {
    const now = new Date();
    let days = rollingAmount;
    if (rollingUnit === "weeks") days = rollingAmount * 7;
    if (rollingUnit === "months") days = rollingAmount * 30;
    return {
      from: subDays(now, days - 1),
      to: now,
    };
  }, [rollingAmount, rollingUnit]);

  // Navigate with params
  function apply() {
    if (tab === "rolling") {
      if (selectedPreset) {
        router.push(`${pathname}?${rangeToSearchParams(selectedPreset)}`);
      } else {
        // Custom rolling amount — convert to fixed dates
        router.push(`${pathname}?${rangeToSearchParams(null, rollingRange)}`);
      }
    } else {
      // Fixed tab — custom date range
      if (fixedRange?.from && fixedRange?.to) {
        router.push(
          `${pathname}?${rangeToSearchParams(null, { from: fixedRange.from, to: fixedRange.to })}`,
        );
      }
    }
    setOpen(false);
  }

  function handlePresetClick(key: PresetKey) {
    setSelectedPreset(key);
    setTab("rolling");
  }

  // Determine what the calendar should highlight based on active tab
  const calendarSelected: DayPickerRange | undefined =
    tab === "fixed"
      ? fixedRange
      : selectedPreset
        ? {
            from: resolvePreset(selectedPreset).from,
            to: resolvePreset(selectedPreset).to,
          }
        : { from: rollingRange.from, to: rollingRange.to };

  const presetLabel = currentPreset
    ? PRESETS.find((p) => p.key === currentPreset)?.label
    : null;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          className="justify-start text-left font-normal gap-3 h-9"
        >
          <span className="flex items-center gap-2">
            <CalendarIcon className="size-4 text-muted-foreground" />
            {presetLabel && <span className="font-medium">{presetLabel}</span>}
          </span>
          <span className="text-muted-foreground text-xs">
            {formatRangeLabel(currentRange)}
          </span>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start" sideOffset={8}>
        <div className="flex">
          {/* Left: Presets */}
          <div className="flex flex-col border-r py-2 min-w-[180px]">
            {PRESETS.map((preset) => (
              <button
                key={preset.key}
                type="button"
                className={cn(
                  "flex items-center justify-between px-3 py-1.5 text-sm text-left hover:bg-muted/60 transition-colors",
                  selectedPreset === preset.key &&
                    tab === "rolling" &&
                    "bg-muted/40 font-medium",
                )}
                onClick={() => handlePresetClick(preset.key)}
              >
                {preset.label}
                {selectedPreset === preset.key && tab === "rolling" && (
                  <Check className="size-4 text-primary" />
                )}
              </button>
            ))}
          </div>

          {/* Right: Tabs + Calendar */}
          <div className="flex flex-col">
            {/* Fixed / Rolling tabs */}
            <div className="flex border-b px-3 pt-2">
              <button
                type="button"
                className={cn(
                  "px-3 pb-2 text-sm font-medium border-b-2 transition-colors",
                  tab === "fixed"
                    ? "border-primary text-primary"
                    : "border-transparent text-muted-foreground hover:text-foreground",
                )}
                onClick={() => {
                  setTab("fixed");
                  setSelectedPreset(null);
                }}
              >
                Fiksni
              </button>
              <button
                type="button"
                className={cn(
                  "px-3 pb-2 text-sm font-medium border-b-2 transition-colors",
                  tab === "rolling"
                    ? "border-primary text-primary"
                    : "border-transparent text-muted-foreground hover:text-foreground",
                )}
                onClick={() => setTab("rolling")}
              >
                Relativni
              </button>
            </div>

            {/* Rolling custom input */}
            {tab === "rolling" && (
              <div className="flex items-center gap-2 px-4 pt-3">
                <span className="text-sm text-muted-foreground">
                  Poslednjih
                </span>
                <input
                  type="number"
                  min={1}
                  max={365}
                  value={rollingAmount}
                  onChange={(e) => {
                    setRollingAmount(Math.max(1, Number(e.target.value) || 1));
                    setSelectedPreset(null);
                  }}
                  className="w-16 h-8 rounded-md border bg-background px-2 text-sm text-center"
                />
                <select
                  value={rollingUnit}
                  onChange={(e) => {
                    setRollingUnit(e.target.value as RollingUnit);
                    setSelectedPreset(null);
                  }}
                  className="h-8 rounded-md border bg-background px-2 text-sm"
                >
                  <option value="days">Dana</option>
                  <option value="weeks">Nedelja</option>
                  <option value="months">Meseci</option>
                </select>
              </div>
            )}

            {/* Calendar */}
            <Calendar
              mode="range"
              numberOfMonths={2}
              selected={calendarSelected}
              onSelect={(range) => {
                if (tab === "fixed") {
                  setFixedRange(range);
                }
              }}
              locale={sr}
              defaultMonth={subDays(new Date(), 30)}
              disabled={{ after: new Date() }}
              className={cn(
                tab === "rolling" && "pointer-events-none opacity-75",
              )}
            />

            {/* Footer: date display + Cancel/Apply */}
            <div className="flex items-center justify-between border-t px-4 py-3">
              <p className="text-sm text-muted-foreground">
                {tab === "fixed" && fixedRange?.from && fixedRange?.to
                  ? `${format(fixedRange.from, "d. MMM yyyy", { locale: sr })} – ${format(fixedRange.to, "d. MMM yyyy", { locale: sr })}`
                  : tab === "fixed"
                    ? "Izaberite period"
                    : selectedPreset
                      ? formatRangeLabel(resolvePreset(selectedPreset))
                      : formatRangeLabel(rollingRange)}
              </p>
              <div className="flex gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setOpen(false)}
                >
                  Otkaži
                </Button>
                <Button
                  size="sm"
                  onClick={apply}
                  disabled={
                    tab === "fixed" && (!fixedRange?.from || !fixedRange?.to)
                  }
                >
                  Primeni
                </Button>
              </div>
            </div>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
