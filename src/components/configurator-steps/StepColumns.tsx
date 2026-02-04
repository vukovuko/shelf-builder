"use client";

import { ArrowRight } from "lucide-react";
import { useShelfStore, type Material, type ShelfState } from "@/lib/store";
import { CompartmentSchematic } from "../CompartmentSchematic";
import { CompartmentExtrasPanel } from "../CompartmentExtrasPanel";
import { Button } from "../ui/button";

interface StepColumnsProps {
  materials: Material[];
  compact?: boolean;
}

export function StepColumns({ materials, compact }: StepColumnsProps) {
  const selectedCompartmentKey = useShelfStore(
    (s: ShelfState) => s.selectedCompartmentKey,
  );
  const setActiveAccordionStep = useShelfStore(
    (s: ShelfState) => s.setActiveAccordionStep,
  );

  return (
    <div className={compact ? "space-y-2 pt-2" : "space-y-4 pt-4"}>
      {!selectedCompartmentKey ? (
        <div className={compact ? "space-y-1" : "space-y-3"}>
          {!compact && <CompartmentSchematic />}
          <p className="text-xs text-center text-muted-foreground">
            Kliknite na pregradu u 3D prikazu
          </p>
        </div>
      ) : (
        <CompartmentExtrasPanel
          compartmentKey={selectedCompartmentKey}
          materials={materials}
        />
      )}

      {!compact && (
        <Button
          variant="default"
          className="w-full mt-4 gap-2"
          onClick={() => setActiveAccordionStep("item-3")}
        >
          Sledeći korak
          <ArrowRight className="h-4 w-4" />
        </Button>
      )}
    </div>
  );
}
