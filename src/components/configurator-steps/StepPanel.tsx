"use client";

import { X } from "lucide-react";
import { useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { type Material, type ShelfState, useShelfStore } from "@/lib/store";
import { CONFIGURATOR_STEPS, StepContent } from "./steps";

/** Wide screens: the active step's controls, to the right of the 3D view. */
export function StepPanel({ materials }: { materials: Material[] }) {
  const activeStep = useShelfStore((s: ShelfState) => s.activeAccordionStep);
  const setActiveStep = useShelfStore(
    (s: ShelfState) => s.setActiveAccordionStep,
  );
  const triggerFitToView = useShelfStore((s: ShelfState) => s.triggerFitToView);
  const step = CONFIGURATOR_STEPS.find((s) => s.id === activeStep);
  const open = step !== undefined;

  // Opening or closing the panel changes the 3D view's width; refit the
  // wardrobe once the canvas has resized.
  const mounted = useRef(false);
  // biome-ignore lint/correctness/useExhaustiveDependencies: runs when the panel opens or closes
  useEffect(() => {
    if (!mounted.current) {
      mounted.current = true;
      return;
    }
    const timer = setTimeout(triggerFitToView, 150);
    return () => clearTimeout(timer);
  }, [open, triggerFitToView]);

  if (!step) return null;

  return (
    <aside
      aria-label={step.title}
      className="flex h-screen w-96 shrink-0 flex-col border-l border-sidebar-border bg-sidebar"
    >
      <div className="flex items-center justify-between gap-2 border-b px-5 py-3">
        <h2 className="text-lg font-bold text-primary">{step.title}</h2>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setActiveStep(null)}
          aria-label="Zatvori"
        >
          <X />
        </Button>
      </div>
      <div className="flex-1 overflow-y-auto px-5 py-4 text-sm">
        <StepContent step={step.id} materials={materials} />
      </div>
    </aside>
  );
}
