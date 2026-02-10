"use client";

import * as React from "react";
import { useRouter, usePathname } from "next/navigation";
import { CalendarIcon, Check } from "lucide-react";
import { format, subDays } from "date-fns";
import { sr } from "date-fns/locale";
import type { DateRange as DayPickerRange } from "react-day-picker";

import { cn } from "@/lib/utils";
import { Button, buttonVariants } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { useIsMobile } from "@/hooks/use-mobile";
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
  const isMobile = useIsMobile();
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
          className="w-full sm:w-auto justify-start text-left font-normal gap-3 h-9"
        >
          <span className="flex items-center gap-2">
            <CalendarIcon className="size-4 text-muted-foreground" />
            {presetLabel && <span className="font-medium">{presetLabel}</span>}
          </span>
          <span className="text-muted-foreground text-xs truncate sm:max-w-none">
            {formatRangeLabel(currentRange)}
          </span>
        </Button>
      </PopoverTrigger>
      <PopoverContent
        className="w-auto p-0 max-w-[calc(100vw-2rem)]"
        align="start"
        sideOffset={8}
      >
        <div className="flex flex-col md:flex-row">
          {/* Presets: horizontal scroll on mobile, vertical sidebar on desktop */}
          <div
            className={cn(
              // Mobile: horizontal scrollable row
              "flex overflow-x-auto gap-1.5 px-3 py-2 border-b",
              // Desktop: vertical sidebar
              "md:flex-col md:overflow-x-visible md:gap-0 md:px-0 md:py-2 md:border-b-0 md:border-r md:min-w-[180px]",
            )}
          >
            {PRESETS.map((preset) =>
              isMobile ? (
                <button
                  key={preset.key}
                  type="button"
                  className={cn(
                    "whitespace-nowrap rounded-full border px-3 py-1 text-xs transition-colors",
                    selectedPreset === preset.key && tab === "rolling"
                      ? "bg-primary text-primary-foreground border-primary"
                      : "hover:bg-muted/60",
                  )}
                  onClick={() => handlePresetClick(preset.key)}
                >
                  {preset.label}
                </button>
              ) : (
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
              ),
            )}
          </div>

          {/* Right: Tabs + Calendar */}
          <div className="flex flex-col min-w-0">
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

            {/* Calendar: 1 month on mobile, 2 on desktop */}
            <Calendar
              mode="range"
              numberOfMonths={isMobile ? 1 : 2}
              fixedWeeks={false}
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
                isMobile ? "p-2" : "p-3",
                tab === "rolling" && "pointer-events-none opacity-75",
              )}
              {...(isMobile && {
                classNames: {
                  month: "flex flex-col gap-1",
                  month_caption:
                    "flex justify-center relative items-center h-6",
                  month_grid: "w-full border-collapse",
                  week: "flex w-full",
                  weekday:
                    "flex-1 text-center text-muted-foreground rounded-md font-normal text-[0.8rem]",
                  day: cn(
                    "flex-1 relative p-0 text-center text-sm focus-within:relative focus-within:z-20 [&:has([aria-selected])]:bg-accent [&:has([aria-selected].day-range-end)]:rounded-r-md [&:has([aria-selected].day-outside)]:bg-accent/50",
                    "[&:has(>.day-range-end)]:rounded-r-md [&:has(>.day-range-start)]:rounded-l-md first:[&:has([aria-selected])]:rounded-l-md last:[&:has([aria-selected])]:rounded-r-md",
                  ),
                  day_button: cn(
                    buttonVariants({ variant: "ghost" }),
                    "h-7 w-full p-0 font-normal aria-selected:opacity-100",
                  ),
                },
              })}
            />

            {/* Footer: date display + Cancel/Apply */}
            <div className="flex items-center justify-between border-t px-3 py-2 md:px-4 md:py-3 gap-2">
              <p className="text-xs sm:text-sm text-muted-foreground truncate min-w-0">
                {tab === "fixed" && fixedRange?.from && fixedRange?.to
                  ? `${format(fixedRange.from, "d. MMM yyyy", { locale: sr })} – ${format(fixedRange.to, "d. MMM yyyy", { locale: sr })}`
                  : tab === "fixed"
                    ? "Izaberite period"
                    : selectedPreset
                      ? formatRangeLabel(resolvePreset(selectedPreset))
                      : formatRangeLabel(rollingRange)}
              </p>
              <div className="flex gap-2 shrink-0">
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
