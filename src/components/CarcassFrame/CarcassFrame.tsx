"use client";

import { Html } from "@react-three/drei";
import React from "react";
import { useShelfStore } from "@/lib/store";
import { buildBlocksX, getDefaultBoundariesX } from "@/lib/wardrobe-utils";
import {
  getMinColumnHeightCm,
  MAX_COLUMN_HEIGHT_CM,
} from "@/lib/wardrobe-constants";
import { Panel } from "@/components/Panel";
import { SeamHandle } from "./SeamHandle";
import { HorizontalSplitHandle } from "./HorizontalSplitHandle";
import { TopHeightHandle } from "./TopHeightHandle";
import { ColumnControlsBar3D } from "./ColumnControlsBar3D";

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
    const hoveredColumnIndex = useShelfStore(
      (state) => state.hoveredColumnIndex,
    );
    const setHoveredColumnIndex = useShelfStore(
      (state) => state.setHoveredColumnIndex,
    );

    // Simple hover handler - only set on enter, not on leave
    // This prevents flickering when moving between compartment and drag handles
    const handleColumnHover = React.useCallback((colIdx: number) => {
      setHoveredColumnIndex(colIdx);
    }, [setHoveredColumnIndex]);

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
    // Max column width (100cm = 1.0m)
    const maxColWidth = 1.0;
    // Min compartment height for drag constraints (10cm = 0.10m)
    const minCompHeight = 0.1;
    // Height threshold for horizontal splits (200cm = 2m)
    const splitThreshold = 2.0;
    // Column height constraints (from wardrobe-constants.ts)
    const maxColumnHeight = MAX_COLUMN_HEIGHT_CM / 100; // 275cm -> meters

    // Dynamic min height based on number of shelves in column
    // Uses config from wardrobe-constants.ts
    const getMinColumnHeight = (colIdx: number): number => {
      const shelves = columnHorizontalBoundaries[colIdx] || [];
      return getMinColumnHeightCm(shelves.length) / 100; // convert to meters
    };

    // Track which columns we've initialized to avoid re-running
    const initializedColumnsRef = React.useRef<Set<number>>(new Set());

    // Stable ref for columnHorizontalBoundaries to avoid effect re-runs during drag
    const columnHorizontalBoundariesRef = React.useRef(columnHorizontalBoundaries);
    React.useEffect(() => {
      columnHorizontalBoundariesRef.current = columnHorizontalBoundaries;
    });

    // Stable ref for setColumnHorizontalBoundaries
    const setColumnHorizontalBoundariesRef = React.useRef(setColumnHorizontalBoundaries);
    React.useEffect(() => {
      setColumnHorizontalBoundariesRef.current = setColumnHorizontalBoundaries;
    });

    // Auto-initialize horizontal splits when column height > 200cm
    React.useEffect(() => {
      columns.forEach((_, colIdx) => {
        const colH = getColumnHeight(colIdx);
        const canHaveSplit = colH > splitThreshold;
        const alreadyInitialized = initializedColumnsRef.current.has(colIdx);
        const existingShelves = columnHorizontalBoundariesRef.current[colIdx] || [];

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
          const numCompartments = shelves.length + 1;

          // Column letter: 0=A, 1=B, 2=C...
          const colLetter = String.fromCharCode(65 + colIdx);

          // Helper: get minY for a shelf (matches getCompartmentHeightCm calculation)
          // Ensures displayed compartment height >= minCompHeight (10cm)
          const getMinYForShelf = (shelfIdx: number): number => {
            const prevY = shelfIdx === 0 ? 0 : shelves[shelfIdx - 1];
            return prevY + minCompHeight;
          };

          // Helper: get maxY for a shelf (matches getCompartmentHeightCm calculation)
          const getMaxYForShelf = (shelfIdx: number): number => {
            const nextY =
              shelfIdx === shelves.length - 1 ? colH : shelves[shelfIdx + 1];
            return nextY - minCompHeight;
          };

          // Calculate compartment center Y positions for labels
          const getCompartmentCenterY = (compIdx: number): number => {
            const bottomY = compIdx === 0 ? t : shelves[compIdx - 1];
            const topY =
              compIdx === shelves.length ? colH - t : shelves[compIdx];
            return (bottomY + topY) / 2;
          };

          // Calculate compartment height (heights add up to column height exactly)
          const getCompartmentHeightCm = (compIdx: number): number => {
            const colHCm = Math.round(colH * 100);

            // For last compartment, calculate as remainder to ensure exact sum
            if (compIdx === shelves.length) {
              let sumPrevious = 0;
              for (let i = 0; i < compIdx; i++) {
                const prevBottomY = i === 0 ? 0 : shelves[i - 1];
                const prevTopY = shelves[i];
                sumPrevious += Math.floor((prevTopY - prevBottomY) * 100);
              }
              return colHCm - sumPrevious;
            }

            // For non-last compartments, use floor (whole cm)
            const bottomY = compIdx === 0 ? 0 : shelves[compIdx - 1];
            const topY = shelves[compIdx];
            return Math.floor((topY - bottomY) * 100);
          };

          // Get compartment bounds for hit area
          const getCompartmentBounds = (compIdx: number) => {
            const bottomY = compIdx === 0 ? t : shelves[compIdx - 1];
            const topY =
              compIdx === shelves.length ? colH - t : shelves[compIdx];
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
                  {/* Only show drag handle when column is hovered - positioned left of center to not overlap labels */}
                  {hoveredColumnIndex === colIdx && (
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

              {/* Top height drag handle */}
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

              {/* Column total height label - shown when hovered */}
              {hoveredColumnIndex === colIdx && (
                <Html
                  position={[colCenterX, colH + 0.05, d / 2]}
                  center
                  zIndexRange={[1, 10]}
                  style={{ pointerEvents: "none" }}
                >
                  <div
                    style={{
                      background: "#0066ff",
                      color: "white",
                      padding: "2px 8px",
                      borderRadius: "4px",
                      fontSize: 12,
                      fontWeight: 600,
                      whiteSpace: "nowrap",
                    }}
                  >
                    {Math.round(colH * 100)}cm
                  </div>
                </Html>
              )}

              {/* Invisible hit areas + Labels for each compartment */}
              {Array.from({ length: numCompartments }).map((_, compIdx) => {
                const bounds = getCompartmentBounds(compIdx);
                const compHeightCm = getCompartmentHeightCm(compIdx);
                // Responsive label sizing based on compartment height
                const showLabel = compHeightCm >= 10; // Hide completely if < 10cm
                // Compact layout for small compartments: "C6 14cm" in one row
                const useCompactLayout = compHeightCm < 20;
                const fontSize = useCompactLayout ? 13 : compHeightCm < 25 ? 18 : 24;

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
                    {/* Label - only show if compartment is large enough */}
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
                            display: "flex",
                            flexDirection: useCompactLayout ? "row" : "column",
                            alignItems: "center",
                            gap: useCompactLayout ? 6 : 2,
                            pointerEvents: "none",
                            background: "rgba(255, 255, 255, 0.95)",
                            padding: useCompactLayout ? "3px 8px" : "4px 8px",
                            borderRadius: "var(--radius)",
                            boxShadow: "0 1px 4px rgba(0,0,0,0.15)",
                          }}
                        >
                          <span
                            style={{
                              fontSize,
                              fontWeight: "bold",
                              color: "#000000",
                            }}
                          >
                            {`${colLetter}${compIdx + 1}`}
                          </span>
                          <span
                            style={{
                              fontSize: useCompactLayout ? 13 : 14,
                              color: "#555555",
                            }}
                          >
                            {`${compHeightCm}cm`}
                          </span>
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

                      // Compartment inner bounds
                      const compBottomY =
                        compIdx === 0 ? t : shelves[compIdx - 1];
                      const compTopY =
                        compIdx === shelves.length ? colH - t : shelves[compIdx];
                      const compInnerH = compTopY - compBottomY;

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

                      const compBottomY =
                        compIdx === 0 ? t : shelves[compIdx - 1];
                      const compTopY =
                        compIdx === shelves.length ? colH - t : shelves[compIdx];
                      const compInnerH = compTopY - compBottomY;

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
                  </React.Fragment>
                );
              })}

              {/* Back panel for this column */}
              <Panel
                position={[colCenterX, colH / 2, -d / 2 + backT / 2]}
                size={[colInnerW + t, colH, backT]}
              />
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

          // Calculate min/max X for this seam based on adjacent columns
          const leftCol = columns[idx];
          const rightCol = columns[idx + 1];
          // Width displayed = seamX - leftCol.start (or rightCol.end - seamX)
          // So constraints are directly on seamX position without thickness adjustment
          // minX: left column at minimum width (20cm) OR right column at maximum width (100cm)
          const minX = Math.max(
            leftCol.start + minColWidth,
            rightCol.end - maxColWidth,
          );
          // maxX: left column at maximum width (100cm) OR right column at minimum width (20cm)
          const maxX = Math.min(
            leftCol.start + maxColWidth,
            rightCol.end - minColWidth,
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
              {/* Drag handle - positioned at max height so it's always visible */}
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
            </React.Fragment>
          );
        })}

        {/* Column controls bar - positioned below wardrobe */}
        <ColumnControlsBar3D depth={d} />
      </group>
    );
  },
);

export default CarcassFrame;
