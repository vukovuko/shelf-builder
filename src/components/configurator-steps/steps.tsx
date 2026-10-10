"use client";

import type { Material } from "@/lib/store";
import { StepAccessories } from "./StepAccessories";
import { StepBase } from "./StepBase";
import { StepColumns } from "./StepColumns";
import { StepDimensions } from "./StepDimensions";
import { StepDoors } from "./StepDoors";
import { StepMaterials } from "./StepMaterials";

/** The configurator's steps; ids are the store's activeAccordionStep values. */
export const CONFIGURATOR_STEPS = [
  {
    id: "item-1",
    label: "Dimenzije",
    title: "1. Definiši spoljašnje dimenzije",
  },
  { id: "item-2", label: "Kolone i pregrade", title: "2. Kolone i Pregrade" },
  { id: "item-3", label: "Materijal", title: "3. Izbor materijala" },
  { id: "item-4", label: "Baza", title: "4. Baza" },
  { id: "item-5", label: "Vrata", title: "5. Vrata" },
  { id: "item-6", label: "Dodaci", title: "6. Dodaci" },
] as const;

export type ConfiguratorStepId = (typeof CONFIGURATOR_STEPS)[number]["id"];

export function StepContent({
  step,
  materials,
}: {
  step: ConfiguratorStepId;
  materials: Material[];
}) {
  switch (step) {
    case "item-1":
      return <StepDimensions />;
    case "item-2":
      return <StepColumns materials={materials} />;
    case "item-3":
      return <StepMaterials materials={materials} />;
    case "item-4":
      return <StepBase />;
    case "item-5":
      return <StepDoors />;
    case "item-6":
      return <StepAccessories />;
  }
}
