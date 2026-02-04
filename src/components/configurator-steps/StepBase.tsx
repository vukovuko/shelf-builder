"use client";

import { ArrowRight } from "lucide-react";
import { useShelfStore, type ShelfState } from "@/lib/store";
import { Button } from "../ui/button";
import { Slider } from "../ui/slider";
import { Switch } from "../ui/switch";

interface StepBaseProps {
  compact?: boolean;
}

export function StepBase({ compact }: StepBaseProps) {
  const hasBase = useShelfStore((s: ShelfState) => s.hasBase);
  const baseHeight = useShelfStore((s: ShelfState) => s.baseHeight);
  const setHasBase = useShelfStore((s: ShelfState) => s.setHasBase);
  const setBaseHeight = useShelfStore((s: ShelfState) => s.setBaseHeight);
  const setActiveAccordionStep = useShelfStore(
    (s: ShelfState) => s.setActiveAccordionStep,
  );

  return (
    <div className={compact ? "space-y-3 pt-2" : "space-y-4 pt-4"}>
      <div className="flex items-center justify-between">
        <label
          htmlFor="switch-base"
          className="text-sm select-none cursor-pointer"
        >
          Uključi bazu (donja pregrada)
        </label>
        <Switch
          id="switch-base"
          checked={hasBase}
          onCheckedChange={setHasBase}
        />
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-sm">Visina baze</span>
          <span className="text-xs text-muted-foreground">{baseHeight} cm</span>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="icon"
            onClick={() => setBaseHeight(Math.max(baseHeight - 1, 3))}
            disabled={!hasBase}
            className="px-2"
          >
            –
          </Button>
          <Slider
            min={3}
            max={10}
            step={1}
            value={[baseHeight]}
            onValueChange={([val]) => setBaseHeight(val)}
            disabled={!hasBase}
            className="flex-1"
          />
          <Button
            variant="outline"
            size="icon"
            onClick={() => setBaseHeight(Math.min(baseHeight + 1, 10))}
            disabled={!hasBase}
            className="px-2"
          >
            +
          </Button>
        </div>
      </div>

      {!compact && (
        <Button
          variant="default"
          className="w-full mt-4 gap-2"
          onClick={() => setActiveAccordionStep("item-5")}
        >
          Sledeći korak
          <ArrowRight className="h-4 w-4" />
        </Button>
      )}
    </div>
  );
}
