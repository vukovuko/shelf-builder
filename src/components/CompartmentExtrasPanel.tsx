"use client";

import React from "react";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { useShelfStore, type Material } from "@/lib/store";
import { buildBlocksX } from "@/lib/wardrobe-utils";
import {
  MIN_DIVIDER_WIDTH_CM,
  MIN_SHELF_HEIGHT_CM,
  MAX_VERTICAL_DIVIDERS,
  MAX_HORIZONTAL_SHELVES_INNER,
  TARGET_BOTTOM_HEIGHT,
} from "@/lib/wardrobe-constants";
import { X } from "lucide-react";

interface CompartmentExtrasPanelProps {
  compartmentKey: string;
  materials: Material[];
}

export function CompartmentExtrasPanel({
  compartmentKey,
  materials,
}: CompartmentExtrasPanelProps) {
  // Store selectors
  const width = useShelfStore((s) => s.width);
  const height = useShelfStore((s) => s.height);
  const selectedMaterialId = useShelfStore((s) => s.selectedMaterialId);
  const verticalBoundaries = useShelfStore((s) => s.verticalBoundaries);
  const columnHorizontalBoundaries = useShelfStore(
    (s) => s.columnHorizontalBoundaries,
  );
  const columnHeights = useShelfStore((s) => s.columnHeights);
  const columnModuleBoundaries = useShelfStore((s) => s.columnModuleBoundaries);
  const columnTopModuleShelves = useShelfStore((s) => s.columnTopModuleShelves);

  const elementConfigs = useShelfStore((s) => s.elementConfigs);
  const setElementColumns = useShelfStore((s) => s.setElementColumns);
  const setElementRowCount = useShelfStore((s) => s.setElementRowCount);
  const setElementDrawerCount = useShelfStore((s) => s.setElementDrawerCount);

  const compartmentExtras = useShelfStore((s) => s.compartmentExtras);
  const toggleCompRod = useShelfStore((s) => s.toggleCompRod);
  const toggleCompLed = useShelfStore((s) => s.toggleCompLed);
  const setSelectedCompartmentKey = useShelfStore(
    (s) => s.setSelectedCompartmentKey,
  );

  // Get current config
  const config = elementConfigs[compartmentKey] ?? {
    columns: 1,
    rowCounts: [0],
  };
  const extras = compartmentExtras[compartmentKey] ?? {};

  // Calculate compartment dimensions
  const w = width / 100;
  const mat = materials.find(
    (m) => String(m.id) === String(selectedMaterialId),
  );
  const thicknessMm = mat?.thickness ?? 18;
  const t = thicknessMm / 1000;

  // Height threshold for module splits (from constants)

  // Calculate compartment width and height
  const blocksX = buildBlocksX(
    w,
    verticalBoundaries.length > 0 ? verticalBoundaries : undefined,
  );

  // Find compartment by key (matching A1, A2, B1, etc.)
  let compartmentWidthCm = 0;
  let compartmentHeightCm = 0;

  // Parse the compartment key to find column and row
  const colLetter = compartmentKey.match(/^[A-Z]+/)?.[0] ?? "A";
  const rowNum = parseInt(compartmentKey.match(/\d+$/)?.[0] ?? "1", 10);

  // Find column index from letter
  const colIdx = colLetter.charCodeAt(0) - 65;

  if (blocksX[colIdx]) {
    compartmentWidthCm = blocksX[colIdx].width * 100;
  }

  // Get column height (use columnHeights or default to global height)
  const colH = (columnHeights[colIdx] ?? height) / 100; // cm to meters

  // Get bottom module shelves for this column
  const shelves = columnHorizontalBoundaries[colIdx] || [];

  // Check for module boundary (top/bottom split)
  const moduleBoundary = columnModuleBoundaries[colIdx] ?? null;
  const hasModuleBoundary =
    moduleBoundary !== null && colH > TARGET_BOTTOM_HEIGHT;

  // Calculate compartment counts
  const bottomModuleCompartments = shelves.length + 1;
  const topModuleShelves = hasModuleBoundary
    ? columnTopModuleShelves[colIdx] || []
    : [];
  const topModuleCompartments = hasModuleBoundary
    ? topModuleShelves.length + 1
    : 0;
  const numCompartments = bottomModuleCompartments + topModuleCompartments;

  // Calculate compartment bounds (matches CarcassFrame.tsx logic)
  const compIdx = rowNum - 1;

  if (compIdx >= 0 && compIdx < numCompartments) {
    // Check if this is a top module compartment
    const isTopModuleCompartment =
      hasModuleBoundary && compIdx >= bottomModuleCompartments;

    let bottomY: number;
    let topY: number;

    if (isTopModuleCompartment) {
      // Top module compartment
      const topCompIdx = compIdx - bottomModuleCompartments;

      if (topCompIdx === 0) {
        // First compartment in top module: starts just above module boundary
        bottomY = moduleBoundary! + t;
      } else {
        // Starts at top module shelf
        bottomY = topModuleShelves[topCompIdx - 1];
      }

      if (topCompIdx === topModuleShelves.length) {
        // Last compartment in top module: ends at top panel
        topY = colH - t;
      } else {
        // Ends at top module shelf
        topY = topModuleShelves[topCompIdx];
      }
    } else {
      // Bottom module compartment
      bottomY = compIdx === 0 ? t : shelves[compIdx - 1];

      if (hasModuleBoundary && compIdx === bottomModuleCompartments - 1) {
        // Last compartment in bottom module (with module boundary)
        topY = moduleBoundary! - t;
      } else if (compIdx === shelves.length && !hasModuleBoundary) {
        // Last compartment (no module boundary)
        topY = colH - t;
      } else {
        // Middle compartment
        topY = shelves[compIdx];
      }
    }

    compartmentHeightCm = Math.round((topY - bottomY) * 100);
  }

  // Calculate limits based on compartment dimensions
  const maxVerticalDividers = Math.max(
    0,
    Math.min(
      MAX_VERTICAL_DIVIDERS,
      Math.floor(compartmentWidthCm / MIN_DIVIDER_WIDTH_CM) - 1,
    ),
  );

  const maxHorizontalShelves = Math.max(
    0,
    Math.min(
      MAX_HORIZONTAL_SHELVES_INNER,
      Math.floor(compartmentHeightCm / MIN_SHELF_HEIGHT_CM) - 1,
    ),
  );

  // Current inner divider count
  const currentVerticalDividers = (config.columns ?? 1) - 1;

  // Disabled state for extras based on subdivisions
  const hasVerticalDividers = config.columns > 1;
  const hasHorizontalShelves = config.rowCounts?.some((c) => c > 0) ?? false;

  // Rod disabled when BOTH vertical AND horizontal subdivisions exist
  const rodDisabled = hasVerticalDividers && hasHorizontalShelves;

  // LED disabled when ANY subdivision exists
  const ledDisabled = hasVerticalDividers || hasHorizontalShelves;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between pb-2 border-b">
        <span className="font-semibold text-lg">Pregrada</span>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setSelectedCompartmentKey(null)}
          className="h-8 w-8"
        >
          <X size={18} />
        </Button>
      </div>

      {/* Dimensions info */}
      <div className="text-xs text-muted-foreground">
        Dimenzije: {Math.round(compartmentWidthCm)}cm x {compartmentHeightCm}cm
      </div>

      {/* Section: Vertikalne pregrade (inner columns) */}
      <div className="space-y-2 pb-3 border-b">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium">Vertikalne pregrade</span>
          <span className="text-xs text-muted-foreground">
            {currentVerticalDividers}{" "}
            {currentVerticalDividers === 1 ? "pregrada" : "pregrada"}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="icon"
            onClick={() => {
              const newVal = Math.max(0, currentVerticalDividers - 1);
              setElementColumns(compartmentKey, newVal + 1);
            }}
            disabled={currentVerticalDividers <= 0}
            className="h-8 w-8"
          >
            –
          </Button>
          <Slider
            min={0}
            max={maxVerticalDividers}
            step={1}
            value={[currentVerticalDividers]}
            onValueChange={([val]) =>
              setElementColumns(compartmentKey, val + 1)
            }
            className="flex-1"
            disabled={maxVerticalDividers <= 0}
          />
          <Button
            variant="outline"
            size="icon"
            onClick={() => {
              const newVal = Math.min(
                maxVerticalDividers,
                currentVerticalDividers + 1,
              );
              setElementColumns(compartmentKey, newVal + 1);
            }}
            disabled={currentVerticalDividers >= maxVerticalDividers}
            className="h-8 w-8"
          >
            +
          </Button>
        </div>
      </div>

      {/* Section: Per-section config (shelves + drawers) */}
      {config.columns > 1 ? (
        <div className="space-y-4 pb-3 border-b">
          <span className="text-sm font-medium">Sekcije</span>
          {Array.from({ length: config.columns }).map((_, idx) => {
            const shelfCount = config.rowCounts?.[idx] ?? 0;
            const drawerCount = config.drawerCounts?.[idx] ?? 0;
            const maxDrawersForSection = shelfCount + 1;
            return (
              <div key={idx} className="space-y-2 p-2 bg-muted/30 rounded">
                <span className="text-xs font-medium text-muted-foreground">
                  Sekcija {idx + 1}
                </span>
                {/* Shelves */}
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground w-14">
                    Police:
                  </span>
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() =>
                      setElementRowCount(
                        compartmentKey,
                        idx,
                        Math.max(shelfCount - 1, 0),
                      )
                    }
                    disabled={shelfCount <= 0}
                    className="h-6 w-6"
                  >
                    –
                  </Button>
                  <Slider
                    min={0}
                    max={maxHorizontalShelves}
                    step={1}
                    value={[shelfCount]}
                    onValueChange={([val]) =>
                      setElementRowCount(compartmentKey, idx, val)
                    }
                    className="flex-1"
                    disabled={maxHorizontalShelves <= 0}
                  />
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() =>
                      setElementRowCount(
                        compartmentKey,
                        idx,
                        Math.min(shelfCount + 1, maxHorizontalShelves),
                      )
                    }
                    disabled={shelfCount >= maxHorizontalShelves}
                    className="h-6 w-6"
                  >
                    +
                  </Button>
                  <span className="text-xs w-4 text-right">{shelfCount}</span>
                </div>
                {/* Drawers - only show if there are shelves */}
                {shelfCount > 0 && (
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground w-14">
                      Fioke:
                    </span>
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() =>
                        setElementDrawerCount(
                          compartmentKey,
                          idx,
                          Math.max(drawerCount - 1, 0),
                        )
                      }
                      disabled={drawerCount <= 0}
                      className="h-6 w-6"
                    >
                      –
                    </Button>
                    <Slider
                      min={0}
                      max={maxDrawersForSection}
                      step={1}
                      value={[drawerCount]}
                      onValueChange={([val]) =>
                        setElementDrawerCount(compartmentKey, idx, val)
                      }
                      className="flex-1"
                    />
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() =>
                        setElementDrawerCount(
                          compartmentKey,
                          idx,
                          Math.min(drawerCount + 1, maxDrawersForSection),
                        )
                      }
                      disabled={drawerCount >= maxDrawersForSection}
                      className="h-6 w-6"
                    >
                      +
                    </Button>
                    <span className="text-xs w-4 text-right">
                      {drawerCount}/{maxDrawersForSection}
                    </span>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      ) : (
        /* Single section - show shelves and drawers directly */
        <div className="space-y-3 pb-3 border-b">
          <span className="text-sm font-medium">Police i Fioke</span>
          {/* Shelves */}
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground w-14">Police:</span>
            <Button
              variant="outline"
              size="icon"
              onClick={() => {
                const count = config.rowCounts?.[0] ?? 0;
                setElementRowCount(compartmentKey, 0, Math.max(count - 1, 0));
              }}
              disabled={(config.rowCounts?.[0] ?? 0) <= 0}
              className="h-7 w-7"
            >
              –
            </Button>
            <Slider
              min={0}
              max={maxHorizontalShelves}
              step={1}
              value={[config.rowCounts?.[0] ?? 0]}
              onValueChange={([val]) =>
                setElementRowCount(compartmentKey, 0, val)
              }
              className="flex-1"
              disabled={maxHorizontalShelves <= 0}
            />
            <Button
              variant="outline"
              size="icon"
              onClick={() => {
                const count = config.rowCounts?.[0] ?? 0;
                setElementRowCount(
                  compartmentKey,
                  0,
                  Math.min(count + 1, maxHorizontalShelves),
                );
              }}
              disabled={(config.rowCounts?.[0] ?? 0) >= maxHorizontalShelves}
              className="h-7 w-7"
            >
              +
            </Button>
            <span className="text-xs w-4 text-right">
              {config.rowCounts?.[0] ?? 0}
            </span>
          </div>
          {/* Drawers - only show if there are shelves */}
          {(config.rowCounts?.[0] ?? 0) > 0 &&
            (() => {
              const shelfCount = config.rowCounts?.[0] ?? 0;
              const drawerCount = config.drawerCounts?.[0] ?? 0;
              const maxDrawersForSection = shelfCount + 1;
              return (
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground w-14">
                    Fioke:
                  </span>
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() =>
                      setElementDrawerCount(
                        compartmentKey,
                        0,
                        Math.max(drawerCount - 1, 0),
                      )
                    }
                    disabled={drawerCount <= 0}
                    className="h-7 w-7"
                  >
                    –
                  </Button>
                  <Slider
                    min={0}
                    max={maxDrawersForSection}
                    step={1}
                    value={[drawerCount]}
                    onValueChange={([val]) =>
                      setElementDrawerCount(compartmentKey, 0, val)
                    }
                    className="flex-1"
                  />
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() =>
                      setElementDrawerCount(
                        compartmentKey,
                        0,
                        Math.min(drawerCount + 1, maxDrawersForSection),
                      )
                    }
                    disabled={drawerCount >= maxDrawersForSection}
                    className="h-7 w-7"
                  >
                    +
                  </Button>
                  <span className="text-xs w-6 text-right">
                    {drawerCount}/{maxDrawersForSection}
                  </span>
                </div>
              );
            })()}
        </div>
      )}

      {/* Section: Dodaci (Extras) */}
      <div className="space-y-2">
        <span className="text-sm font-medium">Dodaci</span>

        <Button
          variant={extras.rod ? "default" : "outline"}
          onClick={() => toggleCompRod(compartmentKey)}
          className="w-full justify-start"
          disabled={rodDisabled}
        >
          {extras.rod ? "✔ " : ""}Šipka za ofingere
          {rodDisabled && (
            <span className="ml-auto text-xs opacity-50">(subdividirano)</span>
          )}
        </Button>

        <Button
          variant={extras.led ? "default" : "outline"}
          onClick={() => toggleCompLed(compartmentKey)}
          className="w-full justify-start"
          disabled={ledDisabled}
        >
          {extras.led ? "✔ " : ""}LED rasveta
          {ledDisabled && (
            <span className="ml-auto text-xs opacity-50">(subdividirano)</span>
          )}
        </Button>
      </div>
    </div>
  );
}
