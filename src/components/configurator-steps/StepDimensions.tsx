"use client";

import { ArrowRight } from "lucide-react";
import { useShelfStore, type ShelfState } from "@/lib/store";
import { DimensionControl } from "../DimensionControl";
import { Button } from "../ui/button";

interface StepDimensionsProps {
  compact?: boolean;
}

export function StepDimensions({ compact }: StepDimensionsProps) {
  const width = useShelfStore((s: ShelfState) => s.width);
  const height = useShelfStore((s: ShelfState) => s.height);
  const depth = useShelfStore((s: ShelfState) => s.depth);
  const setWidth = useShelfStore((s: ShelfState) => s.setWidth);
  const setHeight = useShelfStore((s: ShelfState) => s.setHeight);
  const setDepth = useShelfStore((s: ShelfState) => s.setDepth);
  const setActiveAccordionStep = useShelfStore(
    (s: ShelfState) => s.setActiveAccordionStep,
  );

  return (
    <div className={compact ? "space-y-2 pt-2" : "space-y-6 pt-4"}>
      <DimensionControl
        label="Širina"
        value={width}
        setValue={setWidth}
        min={50}
        max={400}
        step={1}
      />
      <DimensionControl
        label="Visina"
        value={height}
        setValue={setHeight}
        min={50}
        max={280}
        step={1}
      />
      <DimensionControl
        label="Dubina"
        value={depth}
        setValue={setDepth}
        min={20}
        max={100}
        step={1}
      />

      {!compact && (
        <Button
          variant="default"
          className="w-full mt-4 gap-2"
          onClick={() => setActiveAccordionStep("item-2")}
        >
          Sledeći korak
          <ArrowRight className="h-4 w-4" />
        </Button>
      )}
    </div>
  );
}
