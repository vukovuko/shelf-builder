"use client";

import { ArrowRight, Eye, EyeOff } from "lucide-react";
import { useShelfStore, type ShelfState } from "@/lib/store";
import {
  TARGET_BOTTOM_HEIGHT_CM,
  SLIDING_DOOR_MIN_COLUMNS,
} from "@/lib/wardrobe-constants";
import { toLetters, buildBlocksX } from "@/lib/wardrobe-utils";
import { CompartmentSchematic } from "../CompartmentSchematic";
import { DoorOptionsPanel } from "../DoorOptionsPanel";
import { Button } from "../ui/button";

interface StepDoorsProps {
  compact?: boolean;
}

export function StepDoors({ compact }: StepDoorsProps) {
  const width = useShelfStore((s: ShelfState) => s.width);
  const height = useShelfStore((s: ShelfState) => s.height);
  const hasBase = useShelfStore((s: ShelfState) => s.hasBase);
  const baseHeight = useShelfStore((s: ShelfState) => s.baseHeight);
  const verticalBoundaries = useShelfStore(
    (s: ShelfState) => s.verticalBoundaries,
  );
  const columnHorizontalBoundaries = useShelfStore(
    (s: ShelfState) => s.columnHorizontalBoundaries,
  );
  const columnModuleBoundaries = useShelfStore(
    (s: ShelfState) => s.columnModuleBoundaries,
  );
  const columnHeights = useShelfStore((s: ShelfState) => s.columnHeights);
  const columnTopModuleShelves = useShelfStore(
    (s: ShelfState) => s.columnTopModuleShelves,
  );
  const elementConfigs = useShelfStore((s: ShelfState) => s.elementConfigs);
  const selectedDoorCompartments = useShelfStore(
    (s: ShelfState) => s.selectedDoorCompartments,
  );
  const doorGroups = useShelfStore((s: ShelfState) => s.doorGroups);
  const showDoors = useShelfStore((s: ShelfState) => s.showDoors);
  const setShowDoors = useShelfStore((s: ShelfState) => s.setShowDoors);
  const slidingDoors = useShelfStore((s: ShelfState) => s.slidingDoors);
  const setSlidingDoors = useShelfStore((s: ShelfState) => s.setSlidingDoors);
  const setActiveAccordionStep = useShelfStore(
    (s: ShelfState) => s.setActiveAccordionStep,
  );

  const w = width / 100;
  const columns = buildBlocksX(
    w,
    verticalBoundaries.length > 0 ? verticalBoundaries : undefined,
  );
  const numColumns = columns.length;
  const canEnableSliding = numColumns >= SLIDING_DOOR_MIN_COLUMNS;

  const compartmentHeights = (() => {
    const t = 0.018;
    const baseH = hasBase ? baseHeight / 100 : 0;
    const splitThreshold = TARGET_BOTTOM_HEIGHT_CM / 100;

    const heights: Record<string, number> = {};

    columns.forEach((_, colIdx) => {
      const colLetter = toLetters(colIdx);
      const colH = (columnHeights[colIdx] ?? height) / 100;
      const shelves = columnHorizontalBoundaries[colIdx] || [];
      const moduleBoundary = columnModuleBoundaries[colIdx] ?? null;
      const hasModuleBoundary =
        moduleBoundary !== null && colH > splitThreshold;
      const topModuleShelves = columnTopModuleShelves[colIdx] || [];
      const bottomModuleCompartments = shelves.length + 1;

      for (let compIdx = 0; compIdx < bottomModuleCompartments; compIdx++) {
        const compKey = `${colLetter}${compIdx + 1}`;
        let bottomSurface: number;
        let topSurface: number;

        if (hasModuleBoundary && compIdx === bottomModuleCompartments - 1) {
          bottomSurface =
            compIdx === 0 ? baseH + t : shelves[compIdx - 1] + t / 2;
          topSurface = moduleBoundary - t;
        } else {
          bottomSurface =
            compIdx === 0 ? baseH + t : shelves[compIdx - 1] + t / 2;
          if (compIdx === shelves.length && !hasModuleBoundary) {
            topSurface = colH - t;
          } else {
            topSurface = shelves[compIdx] - t / 2;
          }
        }

        heights[compKey] = Math.round((topSurface - bottomSurface) * 100);
      }

      if (hasModuleBoundary) {
        const topModuleCompartments = topModuleShelves.length + 1;
        for (
          let topCompIdx = 0;
          topCompIdx < topModuleCompartments;
          topCompIdx++
        ) {
          const compIdx = bottomModuleCompartments + topCompIdx;
          const compKey = `${colLetter}${compIdx + 1}`;
          let bottomSurface: number;
          let topSurface: number;

          if (topCompIdx === 0) {
            bottomSurface = moduleBoundary + t;
          } else {
            bottomSurface = topModuleShelves[topCompIdx - 1] + t / 2;
          }

          if (topCompIdx === topModuleShelves.length) {
            topSurface = colH - t;
          } else {
            topSurface = topModuleShelves[topCompIdx] - t / 2;
          }

          heights[compKey] = Math.round((topSurface - bottomSurface) * 100);
        }
      }

      // Sub-compartment heights
      const totalCompartments = hasModuleBoundary
        ? bottomModuleCompartments + topModuleShelves.length + 1
        : bottomModuleCompartments;

      for (let compIdx = 0; compIdx < totalCompartments; compIdx++) {
        const compKey = `${colLetter}${compIdx + 1}`;
        const mainHeight = heights[compKey];
        if (!mainHeight) continue;

        const cfg = elementConfigs[compKey] ?? { columns: 1, rowCounts: [0] };
        const innerCols = Math.max(1, cfg.columns);
        const hasSubdivisions =
          innerCols > 1 || (cfg.rowCounts?.some((rc) => rc > 0) ?? false);

        if (!hasSubdivisions) continue;

        const mainHeightM = mainHeight / 100;

        for (let secIdx = 0; secIdx < innerCols; secIdx++) {
          const shelfCount = cfg.rowCounts?.[secIdx] ?? 0;
          const numSpaces = shelfCount + 1;
          const gap = mainHeightM / (shelfCount + 1);

          for (let spaceIdx = 0; spaceIdx < numSpaces; spaceIdx++) {
            const spaceBottomOffset =
              spaceIdx * gap + (spaceIdx > 0 ? t / 2 : 0);
            const spaceTopOffset =
              (spaceIdx + 1) * gap - (spaceIdx < shelfCount ? t / 2 : 0);
            const spaceHeightCm = Math.round(
              (spaceTopOffset - spaceBottomOffset) * 100,
            );

            const subKey = `${compKey}.${secIdx}.${spaceIdx}`;
            heights[subKey] = spaceHeightCm;
          }
        }
      }
      return undefined; // forEach callback
    });
    return heights;
  })();

  return (
    <div className={compact ? "space-y-2 pt-2" : "space-y-4 pt-4"}>
      {slidingDoors ? (
        <DoorOptionsPanel
          selectedKeys={[]}
          compartmentHeights={compartmentHeights}
          canEnableSliding={canEnableSliding}
          slidingDoors={slidingDoors}
          setSlidingDoors={setSlidingDoors}
          numColumns={numColumns}
        />
      ) : (
        <>
          {selectedDoorCompartments.length === 0 ? (
            <div className={compact ? "space-y-1" : "space-y-3"}>
              {!compact && <CompartmentSchematic />}
              <p className="text-xs text-center text-muted-foreground">
                Kliknite na pregradu ili prevucite za višestruki izbor
              </p>
            </div>
          ) : (
            <DoorOptionsPanel
              selectedKeys={selectedDoorCompartments}
              compartmentHeights={compartmentHeights}
              canEnableSliding={canEnableSliding}
              slidingDoors={slidingDoors}
              setSlidingDoors={setSlidingDoors}
              numColumns={numColumns}
            />
          )}
        </>
      )}

      {(doorGroups.length > 0 || slidingDoors) && (
        <Button
          variant="ghost"
          onClick={() => setShowDoors(!showDoors)}
          className={compact ? "w-full" : "w-full mt-4"}
          size="sm"
        >
          {showDoors ? (
            <EyeOff className="h-4 w-4 mr-2" />
          ) : (
            <Eye className="h-4 w-4 mr-2" />
          )}
          {showDoors ? "Sakrij vrata na slici" : "Prikaži vrata na slici"}
        </Button>
      )}

      {!compact && (
        <Button
          variant="default"
          className="w-full mt-4 gap-2"
          onClick={() => setActiveAccordionStep("item-6")}
        >
          Sledeći korak
          <ArrowRight className="h-4 w-4" />
        </Button>
      )}
    </div>
  );
}
