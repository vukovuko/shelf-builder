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

/** A step's controls, greyed out and unclickable, under an "in progress" label. */
export function LockedStep({ children }: { children: ReactNode }) {
  return (
    <div className="relative">
      <div
        inert
        className="pointer-events-none select-none opacity-40 blur-[1px]"
      >
        {children}
      </div>
      <div className="absolute inset-0 flex items-start justify-center p-4 pt-8">
        <p className="rounded-xl bg-background px-5 py-3 text-center text-lg font-bold text-foreground shadow-lg">
          U izradi
        </p>
      </div>
    </div>
  );
}
