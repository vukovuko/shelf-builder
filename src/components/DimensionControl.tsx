"use client";

import { Minus, Plus } from "lucide-react";
import { useId, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";

interface DimensionControlProps {
  label: string;
  value: number;
  setValue: (value: number) => void;
  min: number;
  max: number;
  step: number;
}

export function DimensionControl({
  label,
  value,
  setValue,
  min,
  max,
  step,
}: DimensionControlProps) {
  const inputId = useId();
  // What the user is typing. Clamping every keystroke made typing impossible
  // ("1" of "150" became the minimum), so the field holds the raw text while
  // focused and clamps only on blur or Enter.
  const [draft, setDraft] = useState<string | null>(null);

  const commit = (raw: string) => {
    const typed = Number(raw);
    if (raw.trim() !== "" && Number.isFinite(typed)) {
      setValue(Math.max(min, Math.min(max, Math.round(typed))));
    }
    setDraft(null);
  };
  const handleDecrement = () => setValue(Math.max(min, value - step));
  const handleIncrement = () => setValue(Math.min(max, value + step));

  return (
    <div className="space-y-3">
      <Label htmlFor={inputId} className="font-medium text-foreground">
        {label}
      </Label>
      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          size="icon"
          onClick={handleDecrement}
          className="group"
          aria-label={`Smanji: ${label.toLowerCase()}`}
        >
          <Minus className="h-4 w-4 group-hover:text-primary" />
        </Button>
        <Slider
          value={[value]}
          onValueChange={(vals) => setValue(vals[0])}
          min={min}
          max={max}
          step={step}
        />
        <Button
          variant="outline"
          size="icon"
          onClick={handleIncrement}
          className="group"
          aria-label={`Povećaj: ${label.toLowerCase()}`}
        >
          <Plus className="h-4 w-4 group-hover:text-primary" />
        </Button>
        <div className="relative">
          <Input
            id={inputId}
            type="number"
            inputMode="numeric"
            value={draft ?? value}
            min={min}
            max={max}
            step={step}
            onFocus={(e) => {
              setDraft(String(value));
              e.target.select();
            }}
            onChange={(e) => {
              const raw = e.target.value;
              setDraft(raw);
              // A valid number shows up in 3D right away; out-of-range ones
              // wait for blur so "1" on the way to "150" doesn't jump to 50.
              const typed = Number(raw);
              if (raw !== "" && typed >= min && typed <= max) setValue(typed);
            }}
            onBlur={(e) => commit(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") e.currentTarget.blur();
            }}
            className="w-24 text-center pr-8 bg-input border-border"
          />
          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
            cm
          </span>
        </div>
      </div>
    </div>
  );
}
