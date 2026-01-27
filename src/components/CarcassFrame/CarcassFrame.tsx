"use client";

import { Html } from "@react-three/drei";
import React from "react";
import {
  useShelfStore,
  type ShelfState,
  type DoorGroup,
  type Material,
  parseSubCompKey,
} from "@/lib/store";
import { buildBlocksX, getDefaultBoundariesX } from "@/lib/wardrobe-utils";
import {
  getMinColumnHeightCm,
  MAX_COLUMN_HEIGHT_CM,
  MIN_TOP_HEIGHT,
  MAX_MODULE_HEIGHT,
  MAX_SEGMENT_X,
  TARGET_BOTTOM_HEIGHT,
  MIN_SEGMENT,
  DEFAULT_PANEL_THICKNESS_M,
  MIN_SHELF_HEIGHT_CM,
  MIN_DIVIDER_WIDTH_CM,
} from "@/lib/wardrobe-constants";
import { Panel } from "@/components/Panel";
import { SeamHandle } from "./SeamHandle";
import { HorizontalSplitHandle } from "./HorizontalSplitHandle";
import { TopHeightHandle } from "./TopHeightHandle";
import { ColumnControlsBar3D } from "./ColumnControlsBar3D";
import { ModuleBoundaryHandle } from "./ModuleBoundaryHandle";
import { CompartmentClickCircle } from "./CompartmentClickCircle";
import { DoorClickCircle } from "./DoorClickCircle";
import { SelectionBorderLines } from "./SelectionBorderLines";
import { DimensionLines3D } from "../DimensionLines3D";

interface CarcassFrameProps {
  materials: Material[];
}

export type CarcassFrameHandle = {
  toggleAllInfo: (show: boolean) => void;
};

/**
 * CarcassFrame - Renders multiple compartments based on verticalBoundaries
 * Each column can have independent height, seams go to MAX of adjacent heights
 * Position from floor (Y=0), not centered
 */
const CarcassFrame = React.forwardRef<CarcassFrameHandle, CarcassFrameProps>(
  function CarcassFrame({ materials }, ref) {
    const { width, height, depth, selectedMaterialId } = useShelfStore();
    const verticalBoundaries = useShelfStore(
      (state: ShelfState) => state.verticalBoundaries,
    );
    const setVerticalBoundaries = useShelfStore(
      (state: ShelfState) => state.setVerticalBoundaries,
    );
    const columnHorizontalBoundaries = useShelfStore(
      (state: ShelfState) => state.columnHorizontalBoundaries,
    );
    const setColumnHorizontalBoundaries = useShelfStore(
      (state: ShelfState) => state.setColumnHorizontalBoundaries,
    );
    const columnHeights = useShelfStore(
      (state: ShelfState) => state.columnHeights,
    );
    const elementConfigs = useShelfStore(
      (state: ShelfState) => state.elementConfigs,
    );
    const compartmentExtras = useShelfStore(
      (state: ShelfState) => state.compartmentExtras,
    );
    const hoveredColumnIndex = useShelfStore(
      (state: ShelfState) => state.hoveredColumnIndex,
    );
    const setHoveredColumnIndex = useShelfStore(
      (state: ShelfState) => state.setHoveredColumnIndex,
    );
    const columnModuleBoundaries = useShelfStore(
      (state: ShelfState) => state.columnModuleBoundaries,
    );
    const columnTopModuleShelves = useShelfStore(
      (state: ShelfState) => state.columnTopModuleShelves,
    );
    const activeAccordionStep = useShelfStore(
      (state: ShelfState) => state.activeAccordionStep,
    );
    const isDragging = useShelfStore((state: ShelfState) => state.isDragging);
    const hoveredCompartmentKey = useShelfStore(
      (state: ShelfState) => state.hoveredCompartmentKey,
    );
    const setHoveredCompartmentKey = useShelfStore(
      (state: ShelfState) => state.setHoveredCompartmentKey,
    );
    const selectedCompartmentKey = useShelfStore(
      (state: ShelfState) => state.selectedCompartmentKey,
    );
    const setSelectedCompartmentKey = useShelfStore(
      (state: ShelfState) => state.setSelectedCompartmentKey,
    );
    const hasBase = useShelfStore((state: ShelfState) => state.hasBase);
    const baseHeight = useShelfStore((state: ShelfState) => state.baseHeight);
    const showDimensions = useShelfStore(
      (state: ShelfState) => state.showDimensions,
    );

    // Door selection state (Step 5)
    const selectedDoorCompartments = useShelfStore(
      (state: ShelfState) => state.selectedDoorCompartments,
    );
    const doorSelectionDragging = useShelfStore(
      (state: ShelfState) => state.doorSelectionDragging,
    );
    const startDoorSelection = useShelfStore(
      (state: ShelfState) => state.startDoorSelection,
    );
    const updateDoorSelectionDrag = useShelfStore(
      (state: ShelfState) => state.updateDoorSelectionDrag,
    );
    const endDoorSelection = useShelfStore(
      (state: ShelfState) => state.endDoorSelection,
    );
    // Door groups for 3D rendering
    const doorGroups = useShelfStore((state: ShelfState) => state.doorGroups);
    const showDoors = useShelfStore((state: ShelfState) => state.showDoors);
    // Edges only mode (for "Preuzmi Ivice" download)
    const showEdgesOnly = useShelfStore(
      (state: ShelfState) => state.showEdgesOnly,
    );
    // Front material for doors (global default)
    const selectedFrontMaterialId = useShelfStore(
      (state: ShelfState) => state.selectedFrontMaterialId,
    );
    // Preview mode - hides all interactive controls in admin preview
    const isPreviewMode = useShelfStore(
      (state: ShelfState) => state.isPreviewMode,
    );

    // Check if Step 2 is active (for hiding labels and showing circles)
    const isStep2Active = activeAccordionStep === "item-2";
    // Check if Step 5 is active (for door selection)
    const isStep5Active = activeAccordionStep === "item-5";
    // Combined check for hiding UI elements (including preview mode)
    const hideUIForSteps = isStep2Active || isStep5Active || isPreviewMode;

    // Simple hover handler - only set on enter, not on leave
    // This prevents flickering when moving between compartment and drag handles
    const handleColumnHover = React.useCallback(
      (colIdx: number) => {
        setHoveredColumnIndex(colIdx);
      },
      [setHoveredColumnIndex],
    );

    // Convert cm to meters
    const w = width / 100;
    const d = depth / 100;
    // Base height in meters (0 if base disabled)
    const baseH = hasBase ? baseHeight / 100 : 0;

    // Memoize material lookup to avoid searching on every render
    const material = React.useMemo(
      () =>
        materials.find((m) => String(m.id) === String(selectedMaterialId)) ||
        materials[0],
      [materials, selectedMaterialId],
    );
    const t = ((material?.thickness ?? 18) as number) / 1000; // mm to meters

    // Back panel thickness (5mm)
    const backT = 5 / 1000;

    // Carcass panels depth - shortened to leave room for back panel
    const carcassD = d - backT;
    // Carcass panels Z offset (shifted forward so back panel fits behind)
    const carcassZ = backT / 2;
    // Vertical elements Z offset - 1mm back to prevent edge bleeding (balanced: visible back edges)
    const verticalZ = carcassZ - 0.001;

    // Initialize boundaries if empty but width requires multiple columns
    const defaultBoundaries = React.useMemo(
      () => getDefaultBoundariesX(w),
      [w],
    );
    const hasInitializedVerticalRef = React.useRef(false);

    React.useEffect(() => {
      if (hasInitializedVerticalRef.current) return;
      if (verticalBoundaries.length === 0 && defaultBoundaries.length > 0) {
        setVerticalBoundaries(defaultBoundaries);
        hasInitializedVerticalRef.current = true;
      }
    }, [verticalBoundaries.length, defaultBoundaries, setVerticalBoundaries]);

    // Memoize columns calculation to avoid rebuilding on every render
    const activeBoundaries =
      verticalBoundaries.length > 0 ? verticalBoundaries : defaultBoundaries;
    const columns = React.useMemo(
      () =>
        buildBlocksX(
          w,
          activeBoundaries.length > 0 ? activeBoundaries : undefined,
        ),
      [w, activeBoundaries],
    );

    // Helper: get column height (from columnHeights or default to global height)
    const getColumnHeight = (colIdx: number): number => {
      return (columnHeights[colIdx] ?? height) / 100; // cm to meters
    };

    // Min column width (20cm = 0.2m)
    const minColWidth = 0.2;
    // Max column width (from constants)
    const maxColWidth = MAX_SEGMENT_X;
    // Min compartment height for drag constraints (from constants)
    const minCompHeight = MIN_SEGMENT;
    // Height threshold for horizontal splits (from constants)
    const splitThreshold = TARGET_BOTTOM_HEIGHT;
    // Column height constraints (from wardrobe-constants.ts)
    const maxColumnHeight = MAX_COLUMN_HEIGHT_CM / 100; // 275cm -> meters

    // Dynamic min height based on number of shelves in column
    // Uses config from wardrobe-constants.ts
    const getMinColumnHeight = (colIdx: number): number => {
      const shelves = columnHorizontalBoundaries[colIdx] || [];
      return getMinColumnHeightCm(shelves.length) / 100; // convert to meters
    };

    // Calculate minimum compartment height based on inner shelves from elementConfigs
    // Returns height in METERS. Each section with N shelves needs (N+1) * MIN_SHELF_HEIGHT_CM
    const getMinCompartmentHeightM = (compKey: string): number => {
      const cfg = elementConfigs[compKey];
      if (!cfg) return minCompHeight; // Default 10cm minimum

      const rowCounts = cfg.rowCounts ?? [];
      if (rowCounts.length === 0) return minCompHeight;

      // Find the section with most shelves - that determines minimum height
      // Each section with N shelves creates N+1 spaces, each needing MIN_SHELF_HEIGHT_CM
      let maxRequired = 0;
      for (const shelfCount of rowCounts) {
        const spaces = shelfCount + 1;
        const requiredCm = spaces * MIN_SHELF_HEIGHT_CM;
        maxRequired = Math.max(maxRequired, requiredCm);
      }

      // Add panel thickness allowance (top and bottom inner shelves have half-thickness effect)
      const requiredM = maxRequired / 100;
      return Math.max(minCompHeight, requiredM);
    };

    // Calculate minimum column width based on inner vertical dividers from elementConfigs
    // Checks ALL compartments in the column and returns the maximum requirement
    // Returns width in METERS. Each compartment with N columns needs N * MIN_DIVIDER_WIDTH_CM
    const getMinColumnWidthForCompartments = (
      colIdx: number,
      numCompartments: number,
    ): number => {
      const colLetter = String.fromCharCode(65 + colIdx);
      let maxRequired = minColWidth; // Default 20cm minimum

      for (let compIdx = 0; compIdx < numCompartments; compIdx++) {
        const compKey = `${colLetter}${compIdx + 1}`;
        const cfg = elementConfigs[compKey];
        if (cfg && cfg.columns > 1) {
          // Each section needs MIN_DIVIDER_WIDTH_CM
          const requiredCm = cfg.columns * MIN_DIVIDER_WIDTH_CM;
          const requiredM = requiredCm / 100;
          maxRequired = Math.max(maxRequired, requiredM);
        }
      }

      return maxRequired;
    };

    // Get modules for a column (stacked units with their own back panels)
    // When height > 200cm, column splits into top and bottom modules
    // Back panels extend to floor (Y=0) to cover base area from behind
    const getColumnModules = (
      colIdx: number,
    ): Array<{ yStart: number; yEnd: number; height: number }> => {
      const colH = getColumnHeight(colIdx);
      const boundary = columnModuleBoundaries[colIdx] ?? null;

      // No boundary or height <= 200cm = single module
      if (boundary === null || colH <= splitThreshold) {
        // Back panel extends to floor
        return [{ yStart: 0, yEnd: colH, height: colH }];
      }

      // Two stacked modules
      return [
        // Bottom module - extends to floor
        { yStart: 0, yEnd: boundary, height: boundary },
        // Top module - unchanged (above base area)
        { yStart: boundary, yEnd: colH, height: colH - boundary },
      ];
    };

    // Track which columns we've initialized to avoid re-running
    const initializedColumnsRef = React.useRef<Set<number>>(new Set());

    // Stable ref for columnHorizontalBoundaries to avoid effect re-runs during drag
    const columnHorizontalBoundariesRef = React.useRef(
      columnHorizontalBoundaries,
    );
    React.useEffect(() => {
      columnHorizontalBoundariesRef.current = columnHorizontalBoundaries;
    });

    // Stable ref for setColumnHorizontalBoundaries
    const setColumnHorizontalBoundariesRef = React.useRef(
      setColumnHorizontalBoundaries,
    );
    React.useEffect(() => {
      setColumnHorizontalBoundariesRef.current = setColumnHorizontalBoundaries;
    });

    // Auto-initialize horizontal splits when column height > 200cm
    React.useEffect(() => {
      columns.forEach((_, colIdx) => {
        const colH = getColumnHeight(colIdx);
        const canHaveSplit = colH > splitThreshold;
        const alreadyInitialized = initializedColumnsRef.current.has(colIdx);
        const existingShelves =
          columnHorizontalBoundariesRef.current[colIdx] || [];

        if (
          canHaveSplit &&
          !alreadyInitialized &&
          existingShelves.length === 0
        ) {
          // Initialize with one shelf at middle of column
          setColumnHorizontalBoundariesRef.current(colIdx, [colH / 2]);
          initializedColumnsRef.current.add(colIdx);
        }
        // NOTE: We no longer auto-delete shelves when height drops
        // Instead, we scale them proportionally in setColumnHeight
      });
    }, [columns, columnHeights, height, getColumnHeight]);
    // Removed columnHorizontalBoundaries, setColumnHorizontalBoundaries from deps - using refs instead

    React.useImperativeHandle(ref, () => ({
      toggleAllInfo: () => {},
    }));

    if (materials.length === 0) return null;

    // Side panel heights
    const sideL_H = getColumnHeight(0);
    const sideR_H = getColumnHeight(columns.length - 1);

    // Module boundaries for side panels (for splitting into top/bottom modules)
    const sideL_ModuleBoundary = columnModuleBoundaries[0] ?? null;
    const sideR_ModuleBoundary =
      columnModuleBoundaries[columns.length - 1] ?? null;

    return (
      <group position={[0, 0, 0]}>
        {/* Side L - height of first column (verticalZ to prevent edge bleeding) */}
        {/* Split into two panels if module boundary exists */}
        {sideL_ModuleBoundary && sideL_ModuleBoundary > 0 ? (
          <>
            {/* Side L - Bottom module */}
            <Panel
              position={[-w / 2 + t / 2, sideL_ModuleBoundary / 2, verticalZ]}
              size={[t, sideL_ModuleBoundary, carcassD]}
              showEdgesOnly={showEdgesOnly}
            />
            {/* Side L - Top module */}
            <Panel
              position={[
                -w / 2 + t / 2,
                sideL_ModuleBoundary + (sideL_H - sideL_ModuleBoundary) / 2,
                verticalZ,
              ]}
              size={[t, sideL_H - sideL_ModuleBoundary, carcassD]}
              showEdgesOnly={showEdgesOnly}
            />
          </>
        ) : (
          <Panel
            position={[-w / 2 + t / 2, sideL_H / 2, verticalZ]}
            size={[t, sideL_H, carcassD]}
            showEdgesOnly={showEdgesOnly}
          />
        )}

        {/* Side R - height of last column (verticalZ to prevent edge bleeding) */}
        {/* Split into two panels if module boundary exists */}
        {sideR_ModuleBoundary && sideR_ModuleBoundary > 0 ? (
          <>
            {/* Side R - Bottom module */}
            <Panel
              position={[w / 2 - t / 2, sideR_ModuleBoundary / 2, verticalZ]}
              size={[t, sideR_ModuleBoundary, carcassD]}
              showEdgesOnly={showEdgesOnly}
            />
            {/* Side R - Top module */}
            <Panel
              position={[
                w / 2 - t / 2,
                sideR_ModuleBoundary + (sideR_H - sideR_ModuleBoundary) / 2,
                verticalZ,
              ]}
              size={[t, sideR_H - sideR_ModuleBoundary, carcassD]}
              showEdgesOnly={showEdgesOnly}
            />
          </>
        ) : (
          <Panel
            position={[w / 2 - t / 2, sideR_H / 2, verticalZ]}
            size={[t, sideR_H, carcassD]}
            showEdgesOnly={showEdgesOnly}
          />
        )}

        {/* Front sokl panel - only when base is enabled, hidden in edges mode */}
        {/* Back is covered by back panels (ledja) which extend to floor */}
        {baseH > 0 && !showEdgesOnly && (
          <Panel
            position={[0, baseH / 2, d / 2 - t / 2]}
            size={[w - 2 * t, baseH, t]}
          />
        )}

        {/* Per-column Top & Bottom panels + Horizontal shelves + Labels + TopHeightHandle */}
        {columns.map((col, colIdx) => {
          const colCenterX = (col.start + col.end) / 2;
          const colH = getColumnHeight(colIdx);
          // Each column loses t on left and t on right (to Side panels or seam panels)
          const colInnerW = col.width - 2 * t;

          // Get array of shelf positions for this column (sorted bottom to top)
          const shelves = columnHorizontalBoundaries[colIdx] || [];

          // Check for module boundary
          const moduleBoundary = columnModuleBoundaries[colIdx] ?? null;
          const hasModuleBoundary =
            moduleBoundary !== null && colH > splitThreshold;

          // Bottom module compartments = shelves + 1
          // Top module compartments = top module shelves + 1 (if module boundary exists)
          const bottomModuleCompartments = shelves.length + 1;
          const topModuleShelves = hasModuleBoundary
            ? columnTopModuleShelves[colIdx] || []
            : [];
          const topModuleCompartments = hasModuleBoundary
            ? topModuleShelves.length + 1
            : 0;
          const numCompartments =
            bottomModuleCompartments + topModuleCompartments;

          // Column letter: 0=A, 1=B, 2=C...
          const colLetter = String.fromCharCode(65 + colIdx);

          // Helper: get minY for a shelf (accounts for inner elements in compartment below)
          // Shelf at shelfIdx affects compartment below it (compIdx = shelfIdx)
          const getMinYForShelf = (shelfIdx: number): number => {
            // First shelf starts above bottom panel (t), others above previous shelf
            const prevY = shelfIdx === 0 ? t : shelves[shelfIdx - 1];
            // Compartment below this shelf
            const compKeyBelow = `${colLetter}${shelfIdx + 1}`;
            const minHeightBelow = getMinCompartmentHeightM(compKeyBelow);
            return prevY + minHeightBelow;
          };

          // Helper: get maxY for a shelf (accounts for inner elements in compartment above)
          // Shelf at shelfIdx affects compartment above it (compIdx = shelfIdx + 1)
          const getMaxYForShelf = (shelfIdx: number): number => {
            let nextY: number;
            if (shelfIdx === shelves.length - 1) {
              // Last shelf - constrained by module boundary panel (if exists) or top panel
              nextY = hasModuleBoundary ? moduleBoundary - t : colH - t;
            } else {
              nextY = shelves[shelfIdx + 1];
            }
            // Compartment above this shelf
            const compKeyAbove = `${colLetter}${shelfIdx + 2}`;
            const minHeightAbove = getMinCompartmentHeightM(compKeyAbove);
            return nextY - minHeightAbove;
          };

          // Calculate compartment center Y positions for labels
          // Handles bottom module compartments AND individual compartments within top module
          const getCompartmentCenterY = (compIdx: number): number => {
            // Top module compartments (when compIdx >= bottomModuleCompartments)
            if (hasModuleBoundary && compIdx >= bottomModuleCompartments) {
              const topCompIdx = compIdx - bottomModuleCompartments;

              let bottomY: number;
              let topY: number;

              if (topCompIdx === 0) {
                // First compartment in top module: starts just above module boundary
                bottomY = moduleBoundary + t;
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

              return (bottomY + topY) / 2;
            }

            // Bottom module compartments (account for base height)
            const bottomY = compIdx === 0 ? baseH + t : shelves[compIdx - 1];
            const topY = hasModuleBoundary
              ? compIdx === bottomModuleCompartments - 1
                ? moduleBoundary - t
                : shelves[compIdx]
              : compIdx === shelves.length
                ? colH - t
                : shelves[compIdx];
            return (bottomY + topY) / 2;
          };

          // Calculate compartment INNER usable height (accounts for panel thickness)
          // Panel thickness is subtracted from usable space
          const getCompartmentHeightCm = (compIdx: number): number => {
            // Top module compartments (when compIdx >= bottomModuleCompartments)
            if (hasModuleBoundary && compIdx >= bottomModuleCompartments) {
              const topCompIdx = compIdx - bottomModuleCompartments;

              let bottomSurface: number;
              let topSurface: number;

              if (topCompIdx === 0) {
                // First compartment in top module: starts at top of module boundary panel
                bottomSurface = moduleBoundary + t;
              } else {
                // Starts at top of previous top module shelf
                bottomSurface = topModuleShelves[topCompIdx - 1] + t / 2;
              }

              if (topCompIdx === topModuleShelves.length) {
                // Last compartment in top module: ends at bottom of top panel
                topSurface = colH - t;
              } else {
                // Ends at bottom of current top module shelf
                topSurface = topModuleShelves[topCompIdx] - t / 2;
              }

              return Math.round((topSurface - bottomSurface) * 100);
            }

            // Last compartment in bottom module (when module boundary exists)
            if (hasModuleBoundary && compIdx === bottomModuleCompartments - 1) {
              // Bottom surface: top of bottom panel OR top of previous shelf (account for base)
              const bottomSurface =
                compIdx === 0 ? baseH + t : shelves[compIdx - 1] + t / 2;
              // Top surface: bottom of module separator panel
              const topSurface = moduleBoundary - t;
              return Math.round((topSurface - bottomSurface) * 100);
            }

            // Determine surfaces for regular compartments (bottom module)
            let bottomSurface: number;
            let topSurface: number;

            if (compIdx === 0) {
              // First compartment: starts at top of bottom panel (raised by baseH)
              bottomSurface = baseH + t;
            } else {
              // Starts at top of previous shelf
              bottomSurface = shelves[compIdx - 1] + t / 2;
            }

            if (compIdx === shelves.length && !hasModuleBoundary) {
              // Last compartment (no module boundary): ends at bottom of top panel
              topSurface = colH - t;
            } else {
              // Ends at bottom of current shelf
              topSurface = shelves[compIdx] - t / 2;
            }

            return Math.round((topSurface - bottomSurface) * 100);
          };

          // Get compartment bounds for hit area
          // Handles bottom module compartments AND individual compartments within top module
          const getCompartmentBounds = (compIdx: number) => {
            // Top module compartments (when compIdx >= bottomModuleCompartments)
            if (hasModuleBoundary && compIdx >= bottomModuleCompartments) {
              const topCompIdx = compIdx - bottomModuleCompartments;

              let bottomY: number;
              let topY: number;

              if (topCompIdx === 0) {
                bottomY = moduleBoundary + t;
              } else {
                bottomY = topModuleShelves[topCompIdx - 1];
              }

              if (topCompIdx === topModuleShelves.length) {
                topY = colH - t;
              } else {
                topY = topModuleShelves[topCompIdx];
              }

              const height = topY - bottomY;
              const centerY = (bottomY + topY) / 2;
              return { centerY, height };
            }

            // Bottom module compartments (account for base height)
            const bottomY = compIdx === 0 ? baseH + t : shelves[compIdx - 1];
            const topY = hasModuleBoundary
              ? compIdx === bottomModuleCompartments - 1
                ? moduleBoundary - t
                : shelves[compIdx]
              : compIdx === shelves.length
                ? colH - t
                : shelves[compIdx];
            const height = topY - bottomY;
            const centerY = (bottomY + topY) / 2;
            return { centerY, height };
          };

          return (
            <React.Fragment key={`col-${colIdx}`}>
              {/* Top panel of column */}
              <Panel
                position={[colCenterX, colH - t / 2, carcassZ]}
                size={[colInnerW, t, carcassD]}
                showEdgesOnly={showEdgesOnly}
              />
              {/* Bottom panel of column - raised by baseH when base enabled */}
              <Panel
                position={[colCenterX, baseH + t / 2, carcassZ]}
                size={[colInnerW, t, carcassD]}
                showEdgesOnly={showEdgesOnly}
              />

              {/* Horizontal shelves - one panel per shelf */}
              {shelves.map((shelfY: number, shelfIdx: number) => (
                <React.Fragment key={`shelf-${shelfIdx}`}>
                  <Panel
                    position={[colCenterX, shelfY, carcassZ]}
                    size={[colInnerW, t, carcassD]}
                    showEdgesOnly={showEdgesOnly}
                  />
                  {/* Only show drag handle when column is hovered AND not in Step 2/5 */}
                  {hoveredColumnIndex === colIdx && !hideUIForSteps && (
                    <HorizontalSplitHandle
                      columnIndex={colIdx}
                      shelfIndex={shelfIdx}
                      x={colCenterX - colInnerW * 0.3}
                      y={shelfY}
                      depth={d}
                      colWidth={colInnerW}
                      minY={getMinYForShelf(shelfIdx)}
                      maxY={getMaxYForShelf(shelfIdx)}
                    />
                  )}
                </React.Fragment>
              ))}

              {/* Top height drag handle - HIDE when Step 2/5 active */}
              {/* maxHeight uses sidebar "Visina" value so user can't drag above what sidebar shows */}
              {!hideUIForSteps && (
                <TopHeightHandle
                  columnIndex={colIdx}
                  x={colCenterX}
                  y={colH - t / 2}
                  depth={d}
                  colWidth={colInnerW}
                  minHeight={getMinColumnHeight(colIdx)}
                  maxHeight={height / 100}
                  currentHeightM={colH}
                />
              )}

              {/* Column total height label - shown when hovered, HIDE when Step 2/5 active */}
              {hoveredColumnIndex === colIdx && !hideUIForSteps && (
                <Html
                  position={[colCenterX, colH + 0.18, d / 2]}
                  center
                  zIndexRange={[1, 10]}
                  style={{ pointerEvents: "none" }}
                >
                  <div
                    style={{
                      background: "rgba(255, 255, 255, 0.95)",
                      color: "#000000",
                      padding: "3px 10px",
                      borderRadius: "var(--radius)",
                      fontSize: 13,
                      fontWeight: 600,
                      whiteSpace: "nowrap",
                      boxShadow: "0 1px 4px rgba(0,0,0,0.15)",
                    }}
                  >
                    {Math.round(colH * 100)}cm
                  </div>
                </Html>
              )}

              {/* Invisible hit areas + Labels/Circles for each compartment */}
              {Array.from({ length: numCompartments }).map((_, compIdx) => {
                const bounds = getCompartmentBounds(compIdx);
                const compHeightCm = getCompartmentHeightCm(compIdx);
                const compKey = `${colLetter}${compIdx + 1}`;
                // HIDE labels when Step 2 or 5 is active (show circles instead)
                const showLabel = compHeightCm >= 10 && !hideUIForSteps;
                // Responsive font size based on compartment height
                const fontSize =
                  compHeightCm < 20 ? 13 : compHeightCm < 25 ? 16 : 18;

                const isCompHovered = hoveredCompartmentKey === compKey;
                const isCompSelected = selectedCompartmentKey === compKey;
                // Door selection state for Step 5
                const isDoorSelected =
                  selectedDoorCompartments.includes(compKey);

                // Check if this compartment has subdivisions (for Step 5 event handling)
                const compCfg = elementConfigs[compKey] ?? {
                  columns: 1,
                  rowCounts: [0],
                };
                const compInnerCols = Math.max(1, compCfg.columns);
                const compHasVerticalDividers = compInnerCols > 1;
                const compHasHorizontalShelves =
                  compCfg.rowCounts?.some((c) => c > 0) ?? false;
                // Only ONE type of subdivision = need sub-compartment hit meshes
                const hasOnlyOneSubdivisionType =
                  (compHasVerticalDividers && !compHasHorizontalShelves) ||
                  (!compHasVerticalDividers && compHasHorizontalShelves);

                // Check if this compartment has EXTERNAL drawers (replaces doors)
                const compHasExternalDrawers =
                  (compCfg.drawerCounts?.some((c) => c > 0) ?? false) &&
                  (compCfg.drawersExternal?.some((e) => e !== false) ?? true);

                return (
                  <React.Fragment key={`comp-${compIdx}`}>
                    {/* Clickable hit mesh covering entire compartment front */}
                    {/* For Step 5: only handle events here if NO subdivisions or BOTH types */}
                    <mesh
                      position={[colCenterX, bounds.centerY, d / 2 + 0.005]}
                      onPointerEnter={() => {
                        handleColumnHover(colIdx);
                        if (isStep2Active) setHoveredCompartmentKey(compKey);
                        // Only handle drag update if NOT using sub-compartment meshes
                        // Also skip if compartment has external drawers (replaces doors)
                        if (
                          isStep5Active &&
                          doorSelectionDragging &&
                          !hasOnlyOneSubdivisionType &&
                          !compHasExternalDrawers
                        ) {
                          updateDoorSelectionDrag(compKey);
                        }
                      }}
                      onPointerLeave={() => {
                        if (isStep2Active) setHoveredCompartmentKey(null);
                      }}
                      onClick={() => {
                        if (isStep2Active) setSelectedCompartmentKey(compKey);
                      }}
                      onPointerDown={() => {
                        // Only handle door selection if NOT using sub-compartment meshes
                        // Also skip if compartment has external drawers (replaces doors)
                        if (
                          isStep5Active &&
                          !hasOnlyOneSubdivisionType &&
                          !compHasExternalDrawers
                        )
                          startDoorSelection(compKey);
                      }}
                      onPointerUp={() => {
                        if (isStep5Active && doorSelectionDragging) {
                          endDoorSelection();
                        }
                      }}
                    >
                      <planeGeometry args={[colInnerW, bounds.height]} />
                      <meshBasicMaterial
                        transparent
                        opacity={
                          (isStep2Active &&
                            (isCompHovered || isCompSelected)) ||
                          (isStep5Active &&
                            isDoorSelected &&
                            !compHasExternalDrawers)
                            ? 0.15
                            : 0
                        }
                        color={
                          isCompSelected || isDoorSelected
                            ? "#89b4fa"
                            : "#cdd6f4"
                        }
                      />
                    </mesh>

                    {/* Dashed border - ONLY around SELECTED compartments (while dragging) */}
                    {/* Also skip if compartment has external drawers (replaces doors) */}
                    {isDoorSelected &&
                      !hasOnlyOneSubdivisionType &&
                      !compHasExternalDrawers &&
                      (() => {
                        // KEY-BASED neighbor detection for main compartments
                        let hasNeighborAbove = false;
                        let hasNeighborBelow = false;
                        const compNum = compIdx + 1; // compKey is colLetter + compNum

                        // Check if main compartment ABOVE is selected
                        const compAboveKey = `${colLetter}${compNum + 1}`;
                        if (selectedDoorCompartments.includes(compAboveKey)) {
                          hasNeighborAbove = true;
                        }

                        // Check if main compartment BELOW is selected
                        if (compNum > 1) {
                          const compBelowKey = `${colLetter}${compNum - 1}`;
                          if (selectedDoorCompartments.includes(compBelowKey)) {
                            hasNeighborBelow = true;
                          }
                        }

                        // Check if any sub-compartment of adjacent compartments touches this one
                        for (const key of selectedDoorCompartments) {
                          const parsed = parseSubCompKey(key);
                          if (!parsed || !parsed.isSubComp) continue;
                          // Must be in same column
                          if (parsed.compKey.charAt(0) !== colLetter) continue;

                          // Get parent compartment number
                          const parentCompNum = parseInt(
                            parsed.compKey.slice(1),
                            10,
                          );

                          // Get shelfCount for this sub-compartment's section
                          const parentCfg = elementConfigs[parsed.compKey];
                          const shelfCount =
                            parentCfg?.rowCounts?.[parsed.sectionIdx] ?? 0;

                          // If sub-comp is TOPMOST in its parent, and parent is directly BELOW me
                          if (
                            parsed.spaceIdx === shelfCount &&
                            parentCompNum === compNum - 1
                          ) {
                            hasNeighborBelow = true;
                          }

                          // If sub-comp is BOTTOMMOST in its parent, and parent is directly ABOVE me
                          if (
                            parsed.spaceIdx === 0 &&
                            parentCompNum === compNum + 1
                          ) {
                            hasNeighborAbove = true;
                          }
                        }

                        return (
                          <SelectionBorderLines
                            left={colCenterX - colInnerW / 2}
                            right={colCenterX + colInnerW / 2}
                            bottom={bounds.centerY - bounds.height / 2}
                            top={bounds.centerY + bounds.height / 2}
                            z={d / 2 + 0.012}
                            showTop={!hasNeighborAbove}
                            showBottom={!hasNeighborBelow}
                          />
                        );
                      })()}

                    {/* Clickable circle - SHOW when Step 2 active */}
                    {isStep2Active && (
                      <CompartmentClickCircle
                        compartmentKey={compKey}
                        position={[
                          colCenterX,
                          getCompartmentCenterY(compIdx),
                          d / 2 + 0.02,
                        ]}
                      />
                    )}

                    {/* Door circles - SHOW when Step 5 active */}
                    {/* Renders one circle per sub-space if compartment has subdivisions */}
                    {isStep5Active &&
                      (() => {
                        const cfg = elementConfigs[compKey] ?? {
                          columns: 1,
                          rowCounts: [0],
                        };
                        const innerCols = Math.max(1, cfg.columns);

                        // Get compartment bounds
                        const { centerY, height: compInnerH } =
                          getCompartmentBounds(compIdx);
                        const compBottomY = centerY - compInnerH / 2;
                        const compLeftX = colCenterX - colInnerW / 2;
                        const sectionW = colInnerW / innerCols;

                        // Check subdivision types separately
                        const hasVerticalDividers = innerCols > 1;
                        const hasHorizontalShelves =
                          cfg.rowCounts?.some((c) => c > 0) ?? false;

                        // If BOTH types exist OR neither type exists → single button
                        // Doors can only span ONE dimension (vertical OR horizontal)
                        // When both exist, it's too complex - treat as single compartment
                        if (
                          (hasVerticalDividers && hasHorizontalShelves) ||
                          (!hasVerticalDividers && !hasHorizontalShelves)
                        ) {
                          return (
                            <>
                              <DoorClickCircle
                                compartmentKey={compKey}
                                position={[colCenterX, centerY, d / 2 + 0.02]}
                                heightCm={compHeightCm}
                                columnIndex={colIdx}
                              />
                              {/* Hit mesh for drag detection */}
                              {doorSelectionDragging && (
                                <mesh
                                  position={[
                                    colCenterX,
                                    centerY,
                                    d / 2 + 0.015,
                                  ]}
                                  onPointerMove={(e) => {
                                    e.stopPropagation();
                                    updateDoorSelectionDrag(compKey);
                                  }}
                                  onPointerUp={(e) => {
                                    e.stopPropagation();
                                    endDoorSelection();
                                  }}
                                >
                                  <planeGeometry
                                    args={[colInnerW, compInnerH]}
                                  />
                                  <meshBasicMaterial transparent opacity={0} />
                                </mesh>
                              )}
                            </>
                          );
                        }

                        // Has ONLY ONE type of subdivision - render sub-buttons
                        const subCircles: React.ReactNode[] = [];

                        for (let secIdx = 0; secIdx < innerCols; secIdx++) {
                          const shelfCount = cfg.rowCounts?.[secIdx] ?? 0;
                          const numSpaces = shelfCount + 1;

                          // Section X bounds (account for divider thickness)
                          const secLeftX =
                            compLeftX +
                            secIdx * sectionW +
                            (secIdx > 0 ? t / 2 : 0);
                          const secRightX =
                            compLeftX +
                            (secIdx + 1) * sectionW -
                            (secIdx < innerCols - 1 ? t / 2 : 0);
                          const secCenterX = (secLeftX + secRightX) / 2;

                          // Calculate space positions (distribute evenly)
                          const usableH = compInnerH;
                          const gap = usableH / (shelfCount + 1);

                          for (
                            let spaceIdx = 0;
                            spaceIdx < numSpaces;
                            spaceIdx++
                          ) {
                            // Space bounds (account for shelf thickness)
                            const spaceBottomY =
                              compBottomY +
                              spaceIdx * gap +
                              (spaceIdx > 0 ? t / 2 : 0);
                            const spaceTopY =
                              compBottomY +
                              (spaceIdx + 1) * gap -
                              (spaceIdx < shelfCount ? t / 2 : 0);
                            const spaceCenterY = (spaceBottomY + spaceTopY) / 2;
                            const spaceHeightCm = Math.round(
                              (spaceTopY - spaceBottomY) * 100,
                            );

                            const subKey = `${compKey}.${secIdx}.${spaceIdx}`;
                            const spaceWidth = secRightX - secLeftX;
                            const spaceHeight = spaceTopY - spaceBottomY;
                            const isSubKeySelected =
                              selectedDoorCompartments.includes(subKey);

                            // Hit mesh for sub-compartment - ALWAYS rendered
                            // Handles onPointerDown, onPointerMove, onPointerUp
                            subCircles.push(
                              <mesh
                                key={`hit-${subKey}`}
                                position={[
                                  secCenterX,
                                  spaceCenterY,
                                  d / 2 + 0.006,
                                ]}
                                onPointerDown={(e) => {
                                  e.stopPropagation();
                                  startDoorSelection(subKey);
                                }}
                                onPointerMove={(e) => {
                                  if (doorSelectionDragging) {
                                    e.stopPropagation();
                                    updateDoorSelectionDrag(subKey);
                                  }
                                }}
                                onPointerUp={(e) => {
                                  if (doorSelectionDragging) {
                                    e.stopPropagation();
                                    endDoorSelection();
                                  }
                                }}
                              >
                                <planeGeometry
                                  args={[spaceWidth, spaceHeight]}
                                />
                                <meshBasicMaterial
                                  transparent
                                  opacity={isSubKeySelected ? 0.15 : 0}
                                  color="#89b4fa"
                                />
                              </mesh>,
                            );

                            // Door click circle button on top
                            subCircles.push(
                              <DoorClickCircle
                                key={subKey}
                                compartmentKey={subKey}
                                position={[
                                  secCenterX,
                                  spaceCenterY,
                                  d / 2 + 0.02,
                                ]}
                                heightCm={spaceHeightCm}
                                columnIndex={colIdx}
                              />,
                            );

                            // Dashed border - ONLY around SELECTED sub-compartments
                            // Uses KEY-BASED neighbor detection (reliable)
                            if (isSubKeySelected) {
                              // PRIMARY: Check adjacent sub-compartments within same section by key
                              const neighborAboveKey = `${compKey}.${secIdx}.${spaceIdx + 1}`;
                              const neighborBelowKey = `${compKey}.${secIdx}.${spaceIdx - 1}`;
                              let hasNeighborAbove =
                                selectedDoorCompartments.includes(
                                  neighborAboveKey,
                                );
                              let hasNeighborBelow =
                                selectedDoorCompartments.includes(
                                  neighborBelowKey,
                                );

                              // SECONDARY: Check if main compartment above/below is selected
                              // Extract compartment number from compKey (e.g., "A2" -> 2)
                              const compNum = parseInt(compKey.slice(1), 10);

                              // If this is the TOPMOST sub-space, check if main comp ABOVE is selected
                              if (spaceIdx === shelfCount) {
                                const compAboveKey = `${colLetter}${compNum + 1}`;
                                if (
                                  selectedDoorCompartments.includes(
                                    compAboveKey,
                                  )
                                ) {
                                  hasNeighborAbove = true;
                                }
                              }
                              // If this is the BOTTOMMOST sub-space, check if main comp BELOW is selected
                              if (spaceIdx === 0 && compNum > 1) {
                                const compBelowKey = `${colLetter}${compNum - 1}`;
                                if (
                                  selectedDoorCompartments.includes(
                                    compBelowKey,
                                  )
                                ) {
                                  hasNeighborBelow = true;
                                }
                              }

                              subCircles.push(
                                <SelectionBorderLines
                                  key={`border-${subKey}`}
                                  left={secLeftX}
                                  right={secRightX}
                                  bottom={spaceBottomY}
                                  top={spaceTopY}
                                  z={d / 2 + 0.012}
                                  showTop={!hasNeighborAbove}
                                  showBottom={!hasNeighborBelow}
                                />,
                              );
                            }
                          }
                        }

                        return <>{subCircles}</>;
                      })()}

                    {/* Height label - only show if compartment is large enough AND Step 2/5 not active */}
                    {showLabel && (
                      <Html
                        position={[
                          colCenterX,
                          getCompartmentCenterY(compIdx),
                          d / 2 + 0.01,
                        ]}
                        center
                        zIndexRange={[1, 10]}
                        style={{ pointerEvents: "none" }}
                      >
                        <div
                          style={{
                            pointerEvents: "none",
                            fontSize: 11,
                            fontWeight: "400",
                            color: "#1e1e2e",
                          }}
                        >
                          {`${compHeightCm}cm`}
                        </div>
                      </Html>
                    )}

                    {/* Inner vertical dividers from elementConfigs */}
                    {(() => {
                      const compKey = `${colLetter}${compIdx + 1}`;
                      const cfg = elementConfigs[compKey] ?? {
                        columns: 1,
                        rowCounts: [0],
                      };
                      const innerCols = Math.max(1, cfg.columns);

                      if (innerCols <= 1) return null; // No internal dividers

                      // Use getCompartmentBounds to get correct bounds for both bottom and top module compartments
                      const { centerY, height: compInnerH } =
                        getCompartmentBounds(compIdx);
                      const compBottomY = centerY - compInnerH / 2;
                      const compTopY = centerY + compInnerH / 2;

                      const compLeftX = colCenterX - colInnerW / 2;

                      // Vertical dividers (verticalZ to prevent edge bleeding)
                      // Bottom compartment dividers extend to floor through base
                      const dividerPanels = [];
                      const dividerBottomY =
                        compIdx === 0 && baseH > 0 ? 0 : compBottomY;
                      const dividerH = compTopY - dividerBottomY;
                      for (let divIdx = 1; divIdx < innerCols; divIdx++) {
                        const divX =
                          compLeftX + (divIdx * colInnerW) / innerCols;
                        dividerPanels.push(
                          <Panel
                            key={`vd-${compKey}-${divIdx}`}
                            position={[
                              divX,
                              (dividerBottomY + compTopY) / 2,
                              verticalZ,
                            ]}
                            size={[t, dividerH, carcassD]}
                            showEdgesOnly={showEdgesOnly}
                          />,
                        );
                      }
                      return <>{dividerPanels}</>;
                    })()}

                    {/* Per-section horizontal shelves from elementConfigs */}
                    {(() => {
                      const compKey = `${colLetter}${compIdx + 1}`;
                      const cfg = elementConfigs[compKey] ?? {
                        columns: 1,
                        rowCounts: [0],
                      };
                      const innerCols = Math.max(1, cfg.columns);

                      // Use getCompartmentBounds to get correct bounds for both bottom and top module compartments
                      const { centerY, height: compInnerH } =
                        getCompartmentBounds(compIdx);
                      const compBottomY = centerY - compInnerH / 2;

                      const compLeftX = colCenterX - colInnerW / 2;
                      const sectionW = colInnerW / innerCols;

                      const shelfPanels: React.ReactNode[] = [];
                      for (let secIdx = 0; secIdx < innerCols; secIdx++) {
                        const shelfCount = cfg.rowCounts?.[secIdx] ?? 0;
                        if (shelfCount <= 0) continue;

                        // Section X bounds (account for divider thickness)
                        const secLeftX =
                          compLeftX +
                          secIdx * sectionW +
                          (secIdx > 0 ? t / 2 : 0);
                        const secRightX =
                          compLeftX +
                          (secIdx + 1) * sectionW -
                          (secIdx < innerCols - 1 ? t / 2 : 0);
                        const secCenterX = (secLeftX + secRightX) / 2;
                        const secW = secRightX - secLeftX;

                        // Distribute shelves evenly
                        const usableH = compInnerH;
                        const gap = usableH / (shelfCount + 1);

                        for (let shIdx = 1; shIdx <= shelfCount; shIdx++) {
                          const shelfY = compBottomY + shIdx * gap;
                          shelfPanels.push(
                            <Panel
                              key={`sh-${compKey}-${secIdx}-${shIdx}`}
                              position={[secCenterX, shelfY, carcassZ]}
                              size={[secW, t, carcassD]}
                              showEdgesOnly={showEdgesOnly}
                            />,
                          );
                        }
                      }
                      if (shelfPanels.length === 0) return null;
                      return <>{shelfPanels}</>;
                    })()}

                    {/* Per-section drawer fronts from elementConfigs - hidden in edges mode */}
                    {!showEdgesOnly &&
                      (() => {
                        const compKey = `${colLetter}${compIdx + 1}`;
                        const cfg = elementConfigs[compKey] ?? {
                          columns: 1,
                          rowCounts: [0],
                          drawerCounts: [0],
                        };
                        const innerCols = Math.max(1, cfg.columns);

                        // Use getCompartmentBounds to get correct bounds
                        const { centerY, height: compInnerH } =
                          getCompartmentBounds(compIdx);
                        const compBottomY = centerY - compInnerH / 2;

                        const compLeftX = colCenterX - colInnerW / 2;
                        const sectionW = colInnerW / innerCols;

                        const drawerPanels: React.ReactNode[] = [];
                        for (let secIdx = 0; secIdx < innerCols; secIdx++) {
                          const shelfCount = cfg.rowCounts?.[secIdx] ?? 0;
                          const drawerCount = cfg.drawerCounts?.[secIdx] ?? 0;
                          const isExternal =
                            cfg.drawersExternal?.[secIdx] ?? true;
                          if (drawerCount <= 0) continue;

                          // Section X bounds (account for divider thickness)
                          const secLeftX =
                            compLeftX +
                            secIdx * sectionW +
                            (secIdx > 0 ? t / 2 : 0);
                          const secRightX =
                            compLeftX +
                            (secIdx + 1) * sectionW -
                            (secIdx < innerCols - 1 ? t / 2 : 0);
                          const secCenterX = (secLeftX + secRightX) / 2;
                          const secW = secRightX - secLeftX;

                          // Drawer front dimensions
                          const drawerInset = 0.0015; // 1.5mm per side = 3mm total gap
                          const drawerW = secW - drawerInset * 2;
                          const MIN_DRAWER_SIZE = 0.1; // 10cm minimum drawer dimension
                          // External drawers at door Z level, internal drawers inside
                          const drawerZ = isExternal
                            ? d / 2 + 0.009 // 9mm in front (like door)
                            : d / 2 - 0.05; // 5cm inside
                          // External uses lighter color (door-like), internal uses tan
                          const drawerColor = isExternal
                            ? "#e0d5c7"
                            : "#d4c4b0";

                          // TWO CASES: with shelves vs without shelves
                          if (shelfCount === 0) {
                            // CASE 1: No shelves - drawers divide entire compartment equally
                            const drawerH = compInnerH / drawerCount;
                            for (let drIdx = 0; drIdx < drawerCount; drIdx++) {
                              const drawerBottomY =
                                compBottomY + drIdx * drawerH;
                              const drawerTopY = drawerBottomY + drawerH;
                              const drawerCenterY =
                                (drawerBottomY + drawerTopY) / 2;
                              const actualDrawerH = Math.max(
                                0.02,
                                drawerH - 0.004,
                              );

                              // Skip drawer if below minimum 10x10cm size
                              if (
                                drawerW < MIN_DRAWER_SIZE ||
                                actualDrawerH < MIN_DRAWER_SIZE
                              )
                                continue;

                              drawerPanels.push(
                                <mesh
                                  key={`drawer-${compKey}-${secIdx}-${drIdx}`}
                                  position={[
                                    secCenterX,
                                    drawerCenterY,
                                    drawerZ,
                                  ]}
                                >
                                  <boxGeometry
                                    args={[
                                      drawerW,
                                      actualDrawerH,
                                      DEFAULT_PANEL_THICKNESS_M,
                                    ]}
                                  />
                                  <meshStandardMaterial
                                    color={drawerColor}
                                    roughness={0.7}
                                    metalness={0}
                                  />
                                </mesh>,
                              );
                            }
                          } else {
                            // CASE 2: With shelves - one drawer per space (bottom-up)
                            const usableH = compInnerH;
                            const gap = usableH / (shelfCount + 1);

                            for (
                              let drIdx = 0;
                              drIdx < Math.min(drawerCount, shelfCount + 1);
                              drIdx++
                            ) {
                              const spaceBottomY =
                                compBottomY + drIdx * gap + t / 2;
                              const spaceTopY =
                                compBottomY + (drIdx + 1) * gap - t / 2;
                              const drawerCenterY =
                                (spaceBottomY + spaceTopY) / 2;
                              const actualDrawerH = Math.max(
                                0.02,
                                spaceTopY - spaceBottomY - 0.004,
                              );

                              // Skip drawer if below minimum 10x10cm size
                              if (
                                drawerW < MIN_DRAWER_SIZE ||
                                actualDrawerH < MIN_DRAWER_SIZE
                              )
                                continue;

                              drawerPanels.push(
                                <mesh
                                  key={`drawer-${compKey}-${secIdx}-${drIdx}`}
                                  position={[
                                    secCenterX,
                                    drawerCenterY,
                                    drawerZ,
                                  ]}
                                >
                                  <boxGeometry
                                    args={[
                                      drawerW,
                                      actualDrawerH,
                                      DEFAULT_PANEL_THICKNESS_M,
                                    ]}
                                  />
                                  <meshStandardMaterial
                                    color={drawerColor}
                                    roughness={0.7}
                                    metalness={0}
                                  />
                                </mesh>,
                              );
                            }
                          }
                        }

                        // Rod (šipka za ofingere) - horizontal cylinder at 75% height
                        const extras = compartmentExtras[compKey] ?? {};
                        let rodElement: React.ReactNode = null;
                        if (extras.rod) {
                          const rodRadius = 0.015; // 3cm diameter = 1.5cm radius
                          const rodY = compBottomY + compInnerH * 0.75; // 75% up from bottom
                          const rodLength = colInnerW - 0.01; // Slightly shorter than compartment width
                          rodElement = (
                            <mesh
                              key={`rod-${compKey}`}
                              position={[
                                colCenterX,
                                rodY,
                                d / 2 - carcassD / 2,
                              ]}
                              rotation={[0, 0, Math.PI / 2]} // Rotate to horizontal
                            >
                              <cylinderGeometry
                                args={[rodRadius, rodRadius, rodLength, 16]}
                              />
                              <meshStandardMaterial
                                color="#888888"
                                roughness={0.3}
                                metalness={0.8}
                              />
                            </mesh>
                          );
                        }

                        if (drawerPanels.length === 0 && !rodElement)
                          return null;
                        return (
                          <>
                            {drawerPanels}
                            {rodElement}
                          </>
                        );
                      })()}
                  </React.Fragment>
                );
              })}

              {/* Back panels - ONE PER MODULE (each module has its own back) - hidden in edges mode */}
              {!showEdgesOnly &&
                getColumnModules(colIdx).map((mod, modIdx) => (
                  <Panel
                    key={`back-${colIdx}-${modIdx}`}
                    position={[
                      colCenterX,
                      mod.yStart + mod.height / 2,
                      -d / 2 + backT / 2,
                    ]}
                    size={[colInnerW + t, mod.height, backT]}
                  />
                ))}

              {/* Module boundary panels (TWO panels touching when boundary exists) + drag handle */}
              {(() => {
                const boundary = columnModuleBoundaries[colIdx] ?? null;
                if (boundary === null || colH <= splitThreshold) return null;

                // Min/max Y for module boundary drag
                // Constraints: NO module (top or bottom) can exceed 200cm
                // Also respect inner elements in compartments adjacent to boundary
                const highestShelfY =
                  shelves.length > 0 ? Math.max(...shelves) : t;
                const lowestTopShelfY =
                  topModuleShelves.length > 0
                    ? Math.min(...topModuleShelves)
                    : colH - t;

                // Last bottom compartment (just below boundary)
                const lastBottomCompKey = `${colLetter}${bottomModuleCompartments}`;
                const minHeightLastBottom =
                  getMinCompartmentHeightM(lastBottomCompKey);

                // First top compartment (just above boundary)
                const firstTopCompKey = `${colLetter}${bottomModuleCompartments + 1}`;
                const minHeightFirstTop =
                  getMinCompartmentHeightM(firstTopCompKey);

                const boundaryMinY = Math.max(
                  MIN_TOP_HEIGHT, // Bottom module >= 10cm
                  colH - MAX_MODULE_HEIGHT, // Top module <= 200cm
                  highestShelfY + t + minHeightLastBottom, // Last bottom comp has enough height
                );
                const boundaryMaxY = Math.min(
                  colH - MIN_TOP_HEIGHT, // Top module >= 10cm
                  MAX_MODULE_HEIGHT, // Bottom module <= 200cm
                  lowestTopShelfY - t - minHeightFirstTop, // First top comp has enough height
                );

                return (
                  <>
                    {/* Top panel of bottom module */}
                    <Panel
                      position={[colCenterX, boundary - t / 2, carcassZ]}
                      size={[colInnerW, t, carcassD]}
                      showEdgesOnly={showEdgesOnly}
                    />
                    {/* Bottom panel of top module */}
                    <Panel
                      position={[colCenterX, boundary + t / 2, carcassZ]}
                      size={[colInnerW, t, carcassD]}
                      showEdgesOnly={showEdgesOnly}
                    />
                    {/* Drag handle for module boundary - show when hovered, HIDE when Step 2/5 active */}
                    {hoveredColumnIndex === colIdx && !hideUIForSteps && (
                      <ModuleBoundaryHandle
                        columnIndex={colIdx}
                        x={colCenterX}
                        y={boundary}
                        depth={d}
                        colWidth={colInnerW}
                        minY={boundaryMinY}
                        maxY={boundaryMaxY}
                      />
                    )}
                  </>
                );
              })()}

              {/* Top module shelves (when module boundary exists) */}
              {(() => {
                const boundary = columnModuleBoundaries[colIdx] ?? null;
                if (boundary === null || colH <= splitThreshold) return null;

                const topShelves = columnTopModuleShelves[colIdx] || [];
                if (topShelves.length === 0) return null;

                return (
                  <>
                    {topShelves.map((shelfY: number, shelfIdx: number) => {
                      // Min/max Y for shelf drag within top module
                      const prevY =
                        shelfIdx === 0
                          ? boundary + t
                          : topShelves[shelfIdx - 1];
                      const nextY =
                        shelfIdx === topShelves.length - 1
                          ? colH - t
                          : topShelves[shelfIdx + 1];
                      const shelfMinY = prevY + minCompHeight;
                      const shelfMaxY = nextY - minCompHeight;

                      return (
                        <React.Fragment key={`top-shelf-${colIdx}-${shelfIdx}`}>
                          <Panel
                            position={[colCenterX, shelfY, carcassZ]}
                            size={[colInnerW, t, carcassD]}
                            showEdgesOnly={showEdgesOnly}
                          />
                          {/* Drag handle for top module shelf - show when hovered, HIDE when Step 2/5 active */}
                          {hoveredColumnIndex === colIdx && !hideUIForSteps && (
                            <HorizontalSplitHandle
                              columnIndex={colIdx}
                              shelfIndex={shelfIdx}
                              x={colCenterX + colInnerW * 0.3}
                              y={shelfY}
                              depth={d}
                              colWidth={colInnerW}
                              minY={shelfMinY}
                              maxY={shelfMaxY}
                              isTopModule={true}
                            />
                          )}
                        </React.Fragment>
                      );
                    })}
                  </>
                );
              })()}
            </React.Fragment>
          );
        })}

        {/* Internal seams (2 panels each) + drag handles */}
        {/* Each panel belongs to its column and matches that column's height */}
        {columns.slice(0, -1).map((col, idx) => {
          const seamX = col.end; // Right edge of this column = seam position
          const leftH = getColumnHeight(idx);
          const rightH = getColumnHeight(idx + 1);
          const seamH = Math.max(leftH, rightH); // For SeamHandle positioning only

          // Calculate number of compartments for each adjacent column
          const leftShelves = columnHorizontalBoundaries[idx] || [];
          const leftModuleBoundary = columnModuleBoundaries[idx] ?? null;
          const leftHasModuleBoundary =
            leftModuleBoundary !== null && leftH > splitThreshold;
          const leftBottomComps = leftShelves.length + 1;
          const leftTopComps = leftHasModuleBoundary
            ? (columnTopModuleShelves[idx] || []).length + 1
            : 0;
          const leftNumComps = leftBottomComps + leftTopComps;

          const rightShelves = columnHorizontalBoundaries[idx + 1] || [];
          const rightModuleBoundary = columnModuleBoundaries[idx + 1] ?? null;
          const rightHasModuleBoundary =
            rightModuleBoundary !== null && rightH > splitThreshold;
          const rightBottomComps = rightShelves.length + 1;
          const rightTopComps = rightHasModuleBoundary
            ? (columnTopModuleShelves[idx + 1] || []).length + 1
            : 0;
          const rightNumComps = rightBottomComps + rightTopComps;

          // Calculate min/max X for this seam based on adjacent columns
          const leftCol = columns[idx];
          const rightCol = columns[idx + 1];

          // Get minimum width needed for inner elements in each column
          const leftMinWidth = getMinColumnWidthForCompartments(
            idx,
            leftNumComps,
          );
          const rightMinWidth = getMinColumnWidthForCompartments(
            idx + 1,
            rightNumComps,
          );

          // Width displayed = seamX - leftCol.start (or rightCol.end - seamX)
          // So constraints are directly on seamX position without thickness adjustment
          // minX: left column at minimum width OR right column at maximum width (120cm)
          const minX = Math.max(
            leftCol.start + leftMinWidth,
            rightCol.end - maxColWidth,
          );
          // maxX: left column at maximum width (120cm) OR right column at minimum width
          const maxX = Math.min(
            leftCol.start + maxColWidth,
            rightCol.end - rightMinWidth,
          );

          // Seam heights - full height to floor (seams extend through base)
          const seamLeftH = leftH;
          const seamRightH = rightH;
          // Seam Y positions (centered from floor)
          const seamLeftY = seamLeftH / 2;
          const seamRightY = seamRightH / 2;

          return (
            <React.Fragment key={`seam-${idx}`}>
              {/* Left seam panel - belongs to LEFT column (verticalZ to prevent edge bleeding) */}
              <Panel
                position={[seamX - t / 2, seamLeftY, verticalZ]}
                size={[t, seamLeftH, carcassD]}
                showEdgesOnly={showEdgesOnly}
              />
              {/* Right seam panel - belongs to RIGHT column (verticalZ to prevent edge bleeding) */}
              <Panel
                position={[seamX + t / 2, seamRightY, verticalZ]}
                size={[t, seamRightH, carcassD]}
                showEdgesOnly={showEdgesOnly}
              />
              {/* Drag handle - positioned at max height so it's always visible, HIDE when Step 2/5 active */}
              {!hideUIForSteps && (
                <SeamHandle
                  seamIndex={idx}
                  x={seamX}
                  height={seamH}
                  depth={d}
                  minX={minX}
                  maxX={maxX}
                  leftColStart={leftCol.start}
                  rightColEnd={rightCol.end}
                />
              )}
            </React.Fragment>
          );
        })}

        {/* Door panels - render for each door group (only on Step 5 when showDoors is true), hidden in edges mode */}
        {showDoors &&
          isStep5Active &&
          !showEdgesOnly &&
          doorGroups.map((group: DoorGroup) => {
            // Find which column this door belongs to
            const colIdx = columns.findIndex((_, idx) => {
              const colLetter = String.fromCharCode(65 + idx);
              return group.column === colLetter;
            });
            if (colIdx === -1) return null;

            // Get door material - use per-door material if set, otherwise global
            const doorMaterialId = group.materialId ?? selectedFrontMaterialId;
            const doorMaterial = materials.find((m) => m.id === doorMaterialId);
            // Default door color (Catppuccin lavender) if no material found
            const doorColor = doorMaterial?.img ? "#e8e8e8" : "#b4befe";

            // Check if this is a mirror-type door
            const isMirror = group.type.includes("Mirror");

            const col = columns[colIdx];
            const colCenterX = (col.start + col.end) / 2;
            const colInnerW = col.width - 2 * t;
            const colH = getColumnHeight(colIdx);

            // Get compartment bounds helper for this column
            const shelves = columnHorizontalBoundaries[colIdx] || [];
            const moduleBoundary = columnModuleBoundaries[colIdx] ?? null;
            const hasModuleBoundary =
              moduleBoundary !== null && colH > splitThreshold;
            const topModuleShelves = columnTopModuleShelves[colIdx] || [];
            const bottomModuleCompartments = shelves.length + 1;

            // Get bounds for compartment by key (supports sub-compartment keys like "A1.0.2")
            const getCompBounds = (key: string) => {
              const parsed = parseSubCompKey(key);
              if (!parsed)
                return {
                  bottomY: baseH + t,
                  topY: colH - t,
                  centerX: colCenterX,
                  width: colInnerW,
                };

              const compIdx = parsed.compIdx - 1;

              // Get main compartment bounds first
              let compBottomY: number;
              let compTopY: number;

              // Check if this is a top module compartment
              if (hasModuleBoundary && compIdx >= bottomModuleCompartments) {
                const topCompIdx = compIdx - bottomModuleCompartments;
                compBottomY =
                  topCompIdx === 0
                    ? moduleBoundary + t
                    : topModuleShelves[topCompIdx - 1];
                compTopY =
                  topCompIdx === topModuleShelves.length
                    ? colH - t
                    : topModuleShelves[topCompIdx];
              } else {
                // Bottom module compartment
                compBottomY = compIdx === 0 ? baseH + t : shelves[compIdx - 1];
                if (
                  hasModuleBoundary &&
                  compIdx === bottomModuleCompartments - 1
                ) {
                  compTopY = moduleBoundary - t;
                } else if (compIdx === shelves.length) {
                  compTopY = colH - t;
                } else {
                  compTopY = shelves[compIdx];
                }
              }

              // If not a sub-compartment, return main compartment bounds
              if (!parsed.isSubComp) {
                return {
                  bottomY: compBottomY,
                  topY: compTopY,
                  centerX: colCenterX,
                  width: colInnerW,
                };
              }

              // Handle sub-compartment: get section and space bounds
              const cfg = elementConfigs[parsed.compKey] ?? {
                columns: 1,
                rowCounts: [0],
              };
              const innerCols = Math.max(1, cfg.columns);
              const compInnerH = compTopY - compBottomY;
              const compLeftX = colCenterX - colInnerW / 2;
              const sectionW = colInnerW / innerCols;

              // Section X bounds
              const secIdx = parsed.sectionIdx;
              const secLeftX =
                compLeftX + secIdx * sectionW + (secIdx > 0 ? t / 2 : 0);
              const secRightX =
                compLeftX +
                (secIdx + 1) * sectionW -
                (secIdx < innerCols - 1 ? t / 2 : 0);
              const secCenterX = (secLeftX + secRightX) / 2;
              const secW = secRightX - secLeftX;

              // Space Y bounds within section
              const shelfCount = cfg.rowCounts?.[secIdx] ?? 0;
              const gap = compInnerH / (shelfCount + 1);
              const spaceIdx = parsed.spaceIdx;
              const spaceBottomY =
                compBottomY + spaceIdx * gap + (spaceIdx > 0 ? t / 2 : 0);
              const spaceTopY =
                compBottomY +
                (spaceIdx + 1) * gap -
                (spaceIdx < shelfCount ? t / 2 : 0);

              return {
                bottomY: spaceBottomY,
                topY: spaceTopY,
                centerX: secCenterX,
                width: secW,
              };
            };

            // Calculate door span bounds
            const firstComp = group.compartments[0];
            const lastComp = group.compartments[group.compartments.length - 1];
            const firstBounds = getCompBounds(firstComp);
            const lastBounds = getCompBounds(lastComp);

            const doorBottomY = firstBounds.bottomY;
            const doorTopY = lastBounds.topY;
            const doorHeight = doorTopY - doorBottomY;
            const doorCenterY = (doorBottomY + doorTopY) / 2;

            // Use centerX and width from bounds (supports sub-compartment sections)
            const doorCenterX = firstBounds.centerX;
            const sectionWidth = firstBounds.width;

            // Door dimensions
            const doorInset = 0.002; // 2mm clearance
            const doorW = sectionWidth - doorInset * 2;
            const doorT = DEFAULT_PANEL_THICKNESS_M; // 18mm
            const doorZ = d / 2 + doorT / 2 + 0.001; // In front of carcass

            // Render based on door type
            if (group.type === "double" || group.type === "doubleMirror") {
              // Double doors - two panels with gap
              const gapBetween = 0.003; // 3mm gap
              const leafW = (doorW - gapBetween) / 2;
              const offset = (leafW + gapBetween) / 2;

              return (
                <React.Fragment key={group.id}>
                  <mesh position={[doorCenterX - offset, doorCenterY, doorZ]}>
                    <boxGeometry args={[leafW, doorHeight, doorT]} />
                    {isMirror ? (
                      <meshPhysicalMaterial
                        color="#4a5568"
                        roughness={0.05}
                        metalness={0.95}
                        clearcoat={1}
                        clearcoatRoughness={0.1}
                        reflectivity={1}
                      />
                    ) : (
                      <meshStandardMaterial
                        color={doorColor}
                        roughness={0.5}
                        metalness={0.1}
                      />
                    )}
                  </mesh>
                  <mesh position={[doorCenterX + offset, doorCenterY, doorZ]}>
                    <boxGeometry args={[leafW, doorHeight, doorT]} />
                    {isMirror ? (
                      <meshPhysicalMaterial
                        color="#4a5568"
                        roughness={0.05}
                        metalness={0.95}
                        clearcoat={1}
                        clearcoatRoughness={0.1}
                        reflectivity={1}
                      />
                    ) : (
                      <meshStandardMaterial
                        color={doorColor}
                        roughness={0.5}
                        metalness={0.1}
                      />
                    )}
                  </mesh>
                </React.Fragment>
              );
            }

            // Single door (left, right, leftMirror, rightMirror, or other types)
            return (
              <mesh key={group.id} position={[doorCenterX, doorCenterY, doorZ]}>
                <boxGeometry args={[doorW, doorHeight, doorT]} />
                {isMirror ? (
                  <meshPhysicalMaterial
                    color="#4a5568"
                    roughness={0.05}
                    metalness={0.95}
                    clearcoat={1}
                    clearcoatRoughness={0.1}
                    reflectivity={1}
                  />
                ) : (
                  <meshStandardMaterial
                    color={doorColor}
                    roughness={0.5}
                    metalness={0.1}
                  />
                )}
              </mesh>
            );
          })}

        {/* Column controls bar - positioned below wardrobe, HIDE when Step 2/5 active or dragging */}
        {!hideUIForSteps && !isDragging && <ColumnControlsBar3D depth={d} />}

        {/* 3D Dimension lines (kotiranje) - shown when "Prikaži Mere" is enabled */}
        {showDimensions && (
          <DimensionLines3D
            width={w}
            height={height / 100}
            depth={d}
            panelThickness={t}
            hasBase={hasBase}
            baseHeight={baseH}
          />
        )}
      </group>
    );
  },
);

export default CarcassFrame;
