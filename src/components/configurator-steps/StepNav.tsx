"use client";

import { ChevronRight } from "lucide-react";
import { type ShelfState, useShelfStore } from "@/lib/store";
import { cn } from "@/lib/utils";
import { CONFIGURATOR_STEPS } from "./steps";

/** Wide screens: the steps as a list; the active one opens in StepPanel. */
export function StepNav() {
  const activeStep = useShelfStore((s: ShelfState) => s.activeAccordionStep);
  const setActiveStep = useShelfStore(
    (s: ShelfState) => s.setActiveAccordionStep,
  );

  return (
    <nav aria-label="Koraci" className="space-y-2">
      {CONFIGURATOR_STEPS.map((step, index) => {
        const active = activeStep === step.id;
        return (
          <button
            key={step.id}
            type="button"
            onClick={() => setActiveStep(active ? null : step.id)}
            aria-current={active ? "step" : undefined}
            className={cn(
              "flex w-full items-center gap-3 rounded-xl border px-3 py-3 text-left transition-colors duration-200",
              active
                ? "border-primary/20 bg-primary/8 text-primary shadow-sm ring-1 ring-primary/15"
                : "border-border bg-card hover:border-primary/30",
            )}
          >
            <span
              className={cn(
                "flex size-7 shrink-0 items-center justify-center rounded-full text-sm font-bold",
                active
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground",
              )}
            >
              {index + 1}
            </span>
            <span className="flex-1 text-base font-bold">{step.label}</span>
            <ChevronRight
              className={cn(
                "size-4 shrink-0 transition-opacity",
                active ? "opacity-100" : "opacity-30",
              )}
            />
          </button>
        );
      })}
    </nav>
  );
}
