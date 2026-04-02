"use client";

import React from "react";
import { ArrowRight } from "lucide-react";
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
  const [pinnedMaterialIds, setPinnedMaterialIds] = React.useState<{
    korpus?: number;
    front?: number;
    back?: number;
    edge?: number;
    frontEdge?: number;
  }>({});

  const sections = React.useMemo(
    () => [
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
          material.categories.some((category) => isFrontMaterialCategory(category)),
        ),
        selectedId: selectedFrontMaterialId,
        setSelectedId: setSelectedFrontMaterialId,
      },
      {
        key: "back" as const,
        label: "Materijal za leđa",
        materials: materials.filter((material) =>
          material.categories.some((category) => isBackMaterialCategory(category)),
        ),
        selectedId: selectedBackMaterialId,
        setSelectedId: setSelectedBackMaterialId,
      },
      {
        key: "edge" as const,
        label: "Kant traka za korpuse",
        materials: materials.filter((material) =>
          material.categories.some((category) => isEdgeTapeCategory(category)),
        ),
        selectedId: selectedEdgeMaterialId,
        setSelectedId: setSelectedEdgeMaterialId,
      },
      {
        key: "frontEdge" as const,
        label: "Kant traka za lica/frontove/vrata",
        materials: materials.filter((material) =>
          material.categories.some((category) => isEdgeTapeCategory(category)),
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
      {sections.map((section) => {
        const pinnedId = pinnedMaterialIds[section.key];

        const sorted = [...section.materials].sort((a, b) => {
          if (pinnedId !== undefined) {
            if (a.id === pinnedId) return -1;
            if (b.id === pinnedId) return 1;
          }
          return 0;
        });

        const preview = sorted.slice(0, 3);
        const remaining = section.materials.length - 3;

        return (
          <div
            key={section.key}
            className={compact ? "space-y-2" : "space-y-3"}
          >
            <h4 className="text-sm font-semibold">{section.label}</h4>
            <div className="grid grid-cols-3 gap-2">
              {preview.map((material) => (
                <div key={material.id} className="flex flex-col items-center">
                  <button
                    type="button"
                    className={`rounded-lg border-2 ${
                      section.selectedId === material.id
                        ? "border-primary"
                        : "border-transparent"
                    } hover:border-primary ${compact ? "h-14" : "h-20"} w-full bg-cover bg-center bg-muted`}
                    style={{
                      backgroundImage: material.img
                        ? `url(${material.img})`
                        : undefined,
                    }}
                    onClick={() => section.setSelectedId(material.id)}
                    title={material.name}
                  >
                    <span className="sr-only">{material.name}</span>
                  </button>
                  <span className="text-xs mt-1 text-center truncate w-full">
                    {material.name}
                  </span>
                </div>
              ))}
            </div>
            {remaining > 0 && (
              <Button
                variant="outline"
                size="sm"
                className="w-full"
                onClick={() => setOpenMaterialCategory(section.key)}
              >
                Prikaži više ({remaining})
              </Button>
            )}
            <MaterialPickerModal
              open={openMaterialCategory === section.key}
              onOpenChange={(open) =>
                setOpenMaterialCategory(open ? section.key : null)
              }
              category={section.label}
              materials={section.materials}
              selectedId={section.selectedId}
              onSelect={(id) => {
                section.setSelectedId(id);
                setPinnedMaterialIds((prev) => ({
                  ...prev,
                  [section.key]: id,
                }));
              }}
            />
          </div>
        );
      })}
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
