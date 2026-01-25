"use client";

import { Html } from "@react-three/drei";
import React from "react";
import { useShelfStore } from "@/lib/store";
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

type Material = {
  id: string;
  color?: string;
  thickness?: number;
};

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
      (state) => state.verticalBoundaries,
    );
    const setVerticalBoundaries = useShelfStore(
      (state) => state.setVerticalBoundaries,
    );
    const columnHorizontalBoundaries = useShelfStore(
      (state) => state.columnHorizontalBoundaries,
    );
    const setColumnHorizontalBoundaries = useShelfStore(
      (state) => state.setColumnHorizontalBoundaries,
    );
    const columnHeights = useShelfStore((state) => state.columnHeights);
    const elementConfigs = useShelfStore((state) => state.elementConfigs);
    const compartmentExtras = useShelfStore((state) => state.compartmentExtras);
    const hoveredColumnIndex = useShelfStore(
      (state) => state.hoveredColumnIndex,
    );
    const setHoveredColumnIndex = useShelfStore(
      (state) => state.setHoveredColumnIndex,
    );
    const columnModuleBoundaries = useShelfStore(
      (state) => state.columnModuleBoundaries,
    );
    const columnTopModuleShelves = useShelfStore(
      (state) => state.columnTopModuleShelves,
    );
    const activeAccordionStep = useShelfStore(
      (state) => state.activeAccordionStep,
    );
    const isDragging = useShelfStore((state) => state.isDragging);

    // Check if Step 2 is active (for hiding labels and showing circles)
    const isStep2Active = activeAccordionStep === "item-2";

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
    const getColumnModules = (
      colIdx: number,
    ): Array<{ yStart: number; yEnd: number; height: number }> => {
      const colH = getColumnHeight(colIdx);
      const boundary = columnModuleBoundaries[colIdx] ?? null;

      // No boundary or height <= 200cm = single module
      if (boundary === null || colH <= splitThreshold) {
        return [{ yStart: 0, yEnd: colH, height: colH }];
      }

      // Two stacked modules
      return [
        { yStart: 0, yEnd: boundary, height: boundary }, // Bottom module
        { yStart: boundary, yEnd: colH, height: colH - boundary }, // Top module
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

    return (
      <group position={[0, 0, 0]}>
        {/* Side L - height of first column */}
        <Panel
          position={[-w / 2 + t / 2, sideL_H / 2, carcassZ]}
          size={[t, sideL_H, carcassD]}
        />

        {/* Side R - height of last column */}
        <Panel
          position={[w / 2 - t / 2, sideR_H / 2, carcassZ]}
          size={[t, sideR_H, carcassD]}
        />

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

            // Bottom module compartments
            const bottomY = compIdx === 0 ? t : shelves[compIdx - 1];
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
              // Bottom surface: top of bottom panel OR top of previous shelf
              const bottomSurface =
                compIdx === 0 ? t : shelves[compIdx - 1] + t / 2;
              // Top surface: bottom of module separator panel
              const topSurface = moduleBoundary - t;
              return Math.round((topSurface - bottomSurface) * 100);
            }

            // Determine surfaces for regular compartments (bottom module)
            let bottomSurface: number;
            let topSurface: number;

            if (compIdx === 0) {
              // First compartment: starts at top of bottom panel
              bottomSurface = t;
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

            // Bottom module compartments
            const bottomY = compIdx === 0 ? t : shelves[compIdx - 1];
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
              />
              {/* Bottom panel of column */}
              <Panel
                position={[colCenterX, t / 2, carcassZ]}
                size={[colInnerW, t, carcassD]}
              />

              {/* Horizontal shelves - one panel per shelf */}
              {shelves.map((shelfY, shelfIdx) => (
                <React.Fragment key={`shelf-${shelfIdx}`}>
                  <Panel
                    position={[colCenterX, shelfY, carcassZ]}
                    size={[colInnerW, t, carcassD]}
                  />
                  {/* Only show drag handle when column is hovered AND Step 2 not active */}
                  {hoveredColumnIndex === colIdx && !isStep2Active && (
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

              {/* Top height drag handle - HIDE when Step 2 active */}
              {!isStep2Active && (
                <TopHeightHandle
                  columnIndex={colIdx}
                  x={colCenterX}
                  y={colH - t / 2}
                  depth={d}
                  colWidth={colInnerW}
                  minHeight={getMinColumnHeight(colIdx)}
                  maxHeight={maxColumnHeight}
                  currentHeightM={colH}
                />
              )}

              {/* Column total height label - shown when hovered, HIDE when Step 2 active */}
              {hoveredColumnIndex === colIdx && !isStep2Active && (
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
                // HIDE labels when Step 2 is active (show circles instead)
                const showLabel = compHeightCm >= 10 && !isStep2Active;
                // Responsive font size based on compartment height
                const fontSize =
                  compHeightCm < 20 ? 13 : compHeightCm < 25 ? 16 : 18;

                return (
                  <React.Fragment key={`comp-${compIdx}`}>
                    {/* Invisible hit mesh covering entire compartment front */}
                    <mesh
                      position={[colCenterX, bounds.centerY, d / 2 + 0.005]}
                      onPointerEnter={() => handleColumnHover(colIdx)}
                    >
                      <planeGeometry args={[colInnerW, bounds.height]} />
                      <meshBasicMaterial transparent opacity={0} />
                    </mesh>

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

                    {/* Height label - only show if compartment is large enough AND Step 2 not active */}
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
                            background: "rgba(255, 255, 255, 0.95)",
                            padding: "3px 10px",
                            borderRadius: "var(--radius)",
                            boxShadow: "0 1px 4px rgba(0,0,0,0.15)",
                            fontSize,
                            fontWeight: "500",
                            color: "#333333",
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

                      // Vertical dividers
                      const dividerPanels = [];
                      for (let divIdx = 1; divIdx < innerCols; divIdx++) {
                        const divX =
                          compLeftX + (divIdx * colInnerW) / innerCols;
                        dividerPanels.push(
                          <Panel
                            key={`vd-${compKey}-${divIdx}`}
                            position={[
                              divX,
                              (compBottomY + compTopY) / 2,
                              carcassZ,
                            ]}
                            size={[t, compInnerH, carcassD]}
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
                            />,
                          );
                        }
                      }
                      if (shelfPanels.length === 0) return null;
                      return <>{shelfPanels}</>;
                    })()}

                    {/* Per-section drawer fronts from elementConfigs */}
                    {(() => {
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
                        if (drawerCount <= 0 || shelfCount <= 0) continue;

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

                        // Calculate space positions (N shelves = N+1 spaces)
                        const usableH = compInnerH;
                        const gap = usableH / (shelfCount + 1);

                        // Drawer front dimensions
                        const drawerInset = 0.002; // 2mm inset from section edges
                        const drawerW = secW - drawerInset * 2;
                        const drawerZ = d / 2 + 0.009; // 9mm in front of carcass (door thickness)

                        // Render drawers from bottom up (space 1 = bottom)
                        for (
                          let drIdx = 0;
                          drIdx < Math.min(drawerCount, shelfCount + 1);
                          drIdx++
                        ) {
                          // Space N is between shelf N-1 and shelf N (or bottom/top panel)
                          const spaceBottomY =
                            compBottomY + drIdx * gap + t / 2;
                          const spaceTopY =
                            compBottomY + (drIdx + 1) * gap - t / 2;
                          const drawerCenterY = (spaceBottomY + spaceTopY) / 2;
                          const actualDrawerH = Math.max(
                            0.02,
                            spaceTopY - spaceBottomY - 0.004,
                          );

                          drawerPanels.push(
                            <mesh
                              key={`drawer-${compKey}-${secIdx}-${drIdx}`}
                              position={[secCenterX, drawerCenterY, drawerZ]}
                            >
                              <boxGeometry
                                args={[
                                  drawerW,
                                  actualDrawerH,
                                  DEFAULT_PANEL_THICKNESS_M,
                                ]}
                              />
                              <meshStandardMaterial
                                color="#d4c4b0"
                                roughness={0.7}
                                metalness={0}
                              />
                            </mesh>,
                          );
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
                            position={[colCenterX, rodY, d / 2 - carcassD / 2]}
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

                      if (drawerPanels.length === 0 && !rodElement) return null;
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

              {/* Back panels - ONE PER MODULE (each module has its own back) */}
              {getColumnModules(colIdx).map((mod, modIdx) => (
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
                    />
                    {/* Bottom panel of top module */}
                    <Panel
                      position={[colCenterX, boundary + t / 2, carcassZ]}
                      size={[colInnerW, t, carcassD]}
                    />
                    {/* Drag handle for module boundary - show when hovered, HIDE when Step 2 active */}
                    {hoveredColumnIndex === colIdx && !isStep2Active && (
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
                    {topShelves.map((shelfY, shelfIdx) => {
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
                          />
                          {/* Drag handle for top module shelf - show when hovered, HIDE when Step 2 active */}
                          {hoveredColumnIndex === colIdx && !isStep2Active && (
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

          return (
            <React.Fragment key={`seam-${idx}`}>
              {/* Left seam panel - belongs to LEFT column, uses LEFT height */}
              <Panel
                position={[seamX - t / 2, leftH / 2, carcassZ]}
                size={[t, leftH, carcassD]}
              />
              {/* Right seam panel - belongs to RIGHT column, uses RIGHT height */}
              <Panel
                position={[seamX + t / 2, rightH / 2, carcassZ]}
                size={[t, rightH, carcassD]}
              />
              {/* Drag handle - positioned at max height so it's always visible, HIDE when Step 2 active */}
              {!isStep2Active && (
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

        {/* Column controls bar - positioned below wardrobe, HIDE when Step 2 active or dragging */}
        {!isStep2Active && !isDragging && <ColumnControlsBar3D depth={d} />}
      </group>
    );
  },
);

export default CarcassFrame;
