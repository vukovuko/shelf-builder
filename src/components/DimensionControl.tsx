"use client";

import { Minus, Plus } from "lucide-react";
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
  const handleDecrement = () => setValue(Math.max(min, value - step));
  const handleIncrement = () => setValue(Math.min(max, value + step));

  return (
    <div className="space-y-3">
      <Label className="font-medium text-foreground">{label}</Label>
      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          size="icon"
          onClick={handleDecrement}
          className="group"
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
        >
          <Plus className="h-4 w-4 group-hover:text-primary" />
        </Button>
        <div className="relative">
          <Input
            type="number"
            value={value}
            onChange={(e) => setValue(Number(e.target.value))}
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
