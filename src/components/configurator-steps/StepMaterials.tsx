"use client";

import React from "react";
import { ArrowRight, ChevronDown } from "lucide-react";
import { useShelfStore, type Material, type ShelfState } from "@/lib/store";
import {
  isBackMaterialCategory,
  isEdgeTapeCategory,
  isFrontMaterialCategory,
  isKorpusMaterialCategory,
} from "@/lib/material-categories";
import { MaterialPickerModal } from "../MaterialPickerModal";
import { Button } from "../ui/button";

interface StepMaterialsProps {
  materials: Material[];
  compact?: boolean;
}

export function StepMaterials({ materials, compact }: StepMaterialsProps) {
  const selectedMaterialId = useShelfStore(
    (s: ShelfState) => s.selectedMaterialId,
  );
  const setSelectedMaterialId = useShelfStore(
    (s: ShelfState) => s.setSelectedMaterialId,
  );
  const selectedFrontMaterialId = useShelfStore(
    (s: ShelfState) => s.selectedFrontMaterialId,
  );
  const setSelectedFrontMaterialId = useShelfStore(
    (s: ShelfState) => s.setSelectedFrontMaterialId,
  );
  const selectedBackMaterialId = useShelfStore(
    (s: ShelfState) => s.selectedBackMaterialId,
  );
  const setSelectedBackMaterialId = useShelfStore(
    (s: ShelfState) => s.setSelectedBackMaterialId,
  );
  const selectedEdgeMaterialId = useShelfStore(
    (s: ShelfState) => s.selectedEdgeMaterialId,
  );
  const setSelectedEdgeMaterialId = useShelfStore(
    (s: ShelfState) => s.setSelectedEdgeMaterialId,
  );
  const selectedFrontEdgeMaterialId = useShelfStore(
    (s: ShelfState) => s.selectedFrontEdgeMaterialId,
  );
  const setSelectedFrontEdgeMaterialId = useShelfStore(
    (s: ShelfState) => s.setSelectedFrontEdgeMaterialId,
  );
  const setActiveAccordionStep = useShelfStore(
    (s: ShelfState) => s.setActiveAccordionStep,
  );

  const [openMaterialCategory, setOpenMaterialCategory] = React.useState<
    string | null
  >(null);

  const sections = React.useMemo(
    () =>
      [
        {
          key: "korpus" as const,
          label: "Materijal za korpus",
          materials: materials.filter((material) =>
            material.categories.some((category) =>
              isKorpusMaterialCategory(category),
            ),
          ),
          selectedId: selectedMaterialId,
          setSelectedId: setSelectedMaterialId,
        },
        {
          key: "front" as const,
          label: "Materijal za lica/vrata",
          materials: materials.filter((material) =>
            material.categories.some((category) =>
              isFrontMaterialCategory(category),
            ),
          ),
          selectedId: selectedFrontMaterialId,
          setSelectedId: setSelectedFrontMaterialId,
        },
        {
          key: "back" as const,
          label: "Materijal za leđa",
          materials: materials.filter((material) =>
            material.categories.some((category) =>
              isBackMaterialCategory(category),
            ),
          ),
          selectedId: selectedBackMaterialId,
          setSelectedId: setSelectedBackMaterialId,
        },
        {
          key: "edge" as const,
          label: "Kant traka za korpuse",
          materials: materials.filter((material) =>
            material.categories.some((category) =>
              isEdgeTapeCategory(category),
            ),
          ),
          selectedId: selectedEdgeMaterialId,
          setSelectedId: setSelectedEdgeMaterialId,
        },
        {
          key: "frontEdge" as const,
          label: "Kant traka za lica/frontove/vrata",
          materials: materials.filter((material) =>
            material.categories.some((category) =>
              isEdgeTapeCategory(category),
            ),
          ),
          selectedId: selectedFrontEdgeMaterialId,
          setSelectedId: setSelectedFrontEdgeMaterialId,
        },
      ].filter((section) => section.materials.length > 0),
    [
      materials,
      selectedMaterialId,
      setSelectedMaterialId,
      selectedFrontMaterialId,
      setSelectedFrontMaterialId,
      selectedBackMaterialId,
      setSelectedBackMaterialId,
      selectedEdgeMaterialId,
      setSelectedEdgeMaterialId,
      selectedFrontEdgeMaterialId,
      setSelectedFrontEdgeMaterialId,
    ],
  );

  return (
    <div className={compact ? "space-y-3 pt-2" : "space-y-6 pt-4"}>
      <div
        className={compact ? "grid grid-cols-2 gap-3" : "grid grid-cols-2 gap-4"}
      >
        {sections.map((section) => {
          const selectedMaterial = section.materials.find(
            (material) => material.id === section.selectedId,
          );

          return (
            <React.Fragment key={section.key}>
              <button
                type="button"
                className="flex min-h-[168px] flex-col items-center justify-between rounded-2xl border border-border bg-card px-3 py-4 text-center transition-colors hover:border-primary/50 hover:bg-accent/30"
                onClick={() => setOpenMaterialCategory(section.key)}
              >
                <div className="space-y-1">
                  <p className="text-xs font-medium uppercase tracking-[0.14em] text-muted-foreground">
                    {section.label}
                  </p>
                </div>
                <div
                  className="rounded-full border-2 border-primary/20 bg-muted bg-cover bg-center shadow-sm"
                  style={{
                    width: compact ? "62px" : "84px",
                    height: compact ? "62px" : "84px",
                    backgroundImage: selectedMaterial?.img
                      ? `url(${selectedMaterial.img})`
                      : undefined,
                  }}
                >
                  {!selectedMaterial?.img && (
                    <div className="flex h-full w-full items-center justify-center rounded-full text-[10px] font-medium text-muted-foreground">
                      Bez slike
                    </div>
                  )}
                </div>
                <div className="space-y-1">
                  <p className="line-clamp-2 min-h-[2.5rem] text-sm font-medium leading-5 text-foreground">
                    {selectedMaterial?.name ?? "Izaberite materijal"}
                  </p>
                  {selectedMaterial?.thickness ? (
                    <p className="text-xs text-muted-foreground">
                      {selectedMaterial.thickness}mm
                    </p>
                  ) : (
                    <div className="h-4" />
                  )}
                </div>
                <span className="inline-flex items-center gap-1 text-xs font-medium text-primary">
                  Promeni
                  <ChevronDown className="h-3.5 w-3.5" />
                </span>
              </button>

              <MaterialPickerModal
                open={openMaterialCategory === section.key}
                onOpenChange={(open) =>
                  setOpenMaterialCategory(open ? section.key : null)
                }
                category={section.label}
                materials={section.materials}
                selectedId={section.selectedId}
                onSelect={section.setSelectedId}
              />
            </React.Fragment>
          );
        })}
      </div>

      {selectedBackMaterialId == null && (
        <p className="text-destructive text-sm mt-4">
          Izaberite materijal za leđa
        </p>
      )}

      {!compact && (
        <p className="text-xs text-muted-foreground mt-2 px-2 py-2 bg-muted/50 rounded">
          Materijal za lica/vrata i ručke možete dodatno podesiti po vratima u
          koraku 5.
        </p>
      )}

      {!compact && (
        <Button
          variant="default"
          className="w-full mt-4 gap-2"
          onClick={() => setActiveAccordionStep("item-4")}
        >
          Sledeći korak
          <ArrowRight className="h-4 w-4" />
        </Button>
      )}
    </div>
  );
}
