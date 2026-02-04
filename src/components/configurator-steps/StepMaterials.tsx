"use client";

import React from "react";
import { ArrowRight } from "lucide-react";
import { useShelfStore, type Material, type ShelfState } from "@/lib/store";
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
  }>({});

  // Get all unique categories from materials
  const allCategories = React.useMemo(
    () => [...new Set(materials.flatMap((m) => m.categories))],
    [materials],
  );

  return (
    <div className={compact ? "space-y-3 pt-2" : "space-y-6 pt-4"}>
      {allCategories.map((category) => {
        const categoryMaterials = materials.filter((m) =>
          m.categories.includes(category),
        );
        const isBackCategory =
          category.toLowerCase().includes("leđa") ||
          category.toLowerCase().includes("ledja");
        const isFrontCategory =
          category.toLowerCase().includes("lica") ||
          category.toLowerCase().includes("vrata");

        const categoryType = isBackCategory
          ? "back"
          : isFrontCategory
            ? "front"
            : "korpus";
        const selectedId = isBackCategory
          ? selectedBackMaterialId
          : isFrontCategory
            ? selectedFrontMaterialId
            : selectedMaterialId;
        const setSelectedId = isBackCategory
          ? setSelectedBackMaterialId
          : isFrontCategory
            ? setSelectedFrontMaterialId
            : setSelectedMaterialId;

        const pinnedId = pinnedMaterialIds[categoryType];

        const sorted = [...categoryMaterials].sort((a, b) => {
          if (pinnedId !== undefined) {
            if (a.id === pinnedId) return -1;
            if (b.id === pinnedId) return 1;
          }
          return 0;
        });

        const preview = sorted.slice(0, 3);
        const remaining = categoryMaterials.length - 3;

        return (
          <div key={category} className={compact ? "space-y-2" : "space-y-3"}>
            <h4 className="text-sm font-semibold">{category}</h4>
            <div className="grid grid-cols-3 gap-2">
              {preview.map((material) => (
                <div key={material.id} className="flex flex-col items-center">
                  <button
                    type="button"
                    className={`rounded-lg border-2 ${
                      selectedId === material.id
                        ? "border-primary"
                        : "border-transparent"
                    } hover:border-primary ${compact ? "h-14" : "h-20"} w-full bg-cover bg-center bg-muted`}
                    style={{
                      backgroundImage: material.img
                        ? `url(${material.img})`
                        : undefined,
                    }}
                    onClick={() => setSelectedId(material.id)}
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
                onClick={() => setOpenMaterialCategory(category)}
              >
                Prikaži više ({remaining})
              </Button>
            )}
            <MaterialPickerModal
              open={openMaterialCategory === category}
              onOpenChange={(open) =>
                setOpenMaterialCategory(open ? category : null)
              }
              category={category}
              materials={categoryMaterials}
              selectedId={selectedId}
              onSelect={(id) => {
                setSelectedId(id);
                setPinnedMaterialIds((prev) => ({
                  ...prev,
                  [categoryType]: id,
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
