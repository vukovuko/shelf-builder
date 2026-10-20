"use client";

import { createContext, type ReactNode, useContext } from "react";

/**
 * Two versions of the configurator run on the same code:
 * - "basic" at /design, the public one: only the dimensions and columns
 *   steps work, the rest show as under construction, no AI import.
 * - "full" at /design-test, where the team keeps working on everything.
 */
export type DesignerMode = "basic" | "full";

const LOCKED_IN_BASIC = new Set(["item-3", "item-4", "item-5", "item-6"]);

const DesignerModeContext = createContext<DesignerMode>("full");

export function DesignerModeProvider({
  mode,
  children,
}: {
  mode: DesignerMode;
  children: ReactNode;
}) {
  return (
    <DesignerModeContext.Provider value={mode}>
      {children}
    </DesignerModeContext.Provider>
  );
}

export function useDesignerMode() {
  return useContext(DesignerModeContext);
}

export function lockedStepsFor(mode: DesignerMode): string[] {
  return mode === "basic" ? [...LOCKED_IN_BASIC] : [];
}

export function isStepLocked(mode: DesignerMode, stepId: string | null) {
  return mode === "basic" && stepId !== null && LOCKED_IN_BASIC.has(stepId);
}

/** Stands in for a step's controls while the step isn't public yet. */
export function LockedStep() {
  return (
    <div className="flex justify-center py-8">
      <p className="rounded-xl border border-border bg-card px-5 py-3 text-lg font-bold text-foreground">
        U izradi
      </p>
    </div>
  );
}
