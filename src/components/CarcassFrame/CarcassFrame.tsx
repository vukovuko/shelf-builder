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
    const setHoveredColumnIndex = useShelfStore(
      (state) => state.setHoveredColumnIndex,
    );

    // Convert cm to meters
    const w = width / 100;
    const d = depth / 100;

    // Get material thickness
    const material =
      materials.find((m) => String(m.id) === String(selectedMaterialId)) ||
      materials[0];
    const t = ((material?.thickness ?? 18) as number) / 1000; // mm to meters

    // Back panel thickness (5mm)
    const backT = 5 / 1000;

    // Carcass panels depth - shortened to leave room for back panel
    const carcassD = d - backT;
    // Carcass panels Z offset (shifted forward so back panel fits behind)
    const carcassZ = backT / 2;

    // Initialize boundaries if empty but width requires multiple columns
    const defaultBoundaries = getDefaultBoundariesX(w);
    const hasInitializedVerticalRef = React.useRef(false);

    React.useEffect(() => {
      if (hasInitializedVerticalRef.current) return;
      if (verticalBoundaries.length === 0 && defaultBoundaries.length > 0) {
        setVerticalBoundaries(defaultBoundaries);
        hasInitializedVerticalRef.current = true;
      }
    }, [verticalBoundaries.length, defaultBoundaries, setVerticalBoundaries]);

    // Calculate columns from boundaries
    const activeBoundaries =
      verticalBoundaries.length > 0 ? verticalBoundaries : defaultBoundaries;
    const columns = buildBlocksX(
      w,
      activeBoundaries.length > 0 ? activeBoundaries : undefined,
    );

    // Helper: get column height (from columnHeights or default to global height)
    const getColumnHeight = (colIdx: number): number => {
      return (columnHeights[colIdx] ?? height) / 100; // cm to meters
    };

    // Min column width (20cm = 0.2m)
    const minColWidth = 0.2;
    // Min compartment height for drag constraints (5cm = 0.05m)
    // Reduced from 20cm to allow fine-grained dragging with many shelves
    const minCompHeight = 0.05;
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

    // Auto-initialize horizontal splits when column height > 200cm
    React.useEffect(() => {
      columns.forEach((_, colIdx) => {
        const colH = getColumnHeight(colIdx);
        const canHaveSplit = colH > splitThreshold;
        const alreadyInitialized = initializedColumnsRef.current.has(colIdx);
        const existingShelves = columnHorizontalBoundaries[colIdx] || [];

        if (
          canHaveSplit &&
          !alreadyInitialized &&
          existingShelves.length === 0
        ) {
          // Initialize with one shelf at middle of column
          setColumnHorizontalBoundaries(colIdx, [colH / 2]);
          initializedColumnsRef.current.add(colIdx);
        }
        // NOTE: We no longer auto-delete shelves when height drops
        // Instead, we scale them proportionally in setColumnHeight
      });
    }, [
      columns,
      columnHeights,
      columnHorizontalBoundaries,
      setColumnHorizontalBoundaries,
      height,
    ]);

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

          // Helper: get minY for a shelf (above previous shelf or bottom panel)
          const getMinYForShelf = (shelfIdx: number): number => {
            const prevY = shelfIdx === 0 ? t : shelves[shelfIdx - 1] + t;
            return prevY + minCompHeight;
          };

          // Helper: get maxY for a shelf (below next shelf or top panel)
          const getMaxYForShelf = (shelfIdx: number): number => {
            const nextY =
              shelfIdx === shelves.length - 1
                ? colH - t
                : shelves[shelfIdx + 1] - t;
            return nextY - minCompHeight;
          };

          // Calculate compartment center Y positions for labels
          const getCompartmentCenterY = (compIdx: number): number => {
            const bottomY = compIdx === 0 ? t : shelves[compIdx - 1];
            const topY =
              compIdx === shelves.length ? colH - t : shelves[compIdx];
            return (bottomY + topY) / 2;
          };

          // Calculate compartment inner height (excluding panel thickness)
          const getCompartmentHeightCm = (compIdx: number): number => {
            const bottomY = compIdx === 0 ? t : shelves[compIdx - 1] + t / 2;
            const topY =
              compIdx === shelves.length ? colH - t : shelves[compIdx] - t / 2;
            return Math.round((topY - bottomY) * 100); // meters to cm, rounded
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
                  <HorizontalSplitHandle
                    columnIndex={colIdx}
                    shelfIndex={shelfIdx}
                    x={colCenterX}
                    y={shelfY}
                    depth={d}
                    colWidth={colInnerW}
                    minY={getMinYForShelf(shelfIdx)}
                    maxY={getMaxYForShelf(shelfIdx)}
                  />
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

              {/* Invisible hit areas + Labels for each compartment */}
              {Array.from({ length: numCompartments }).map((_, compIdx) => {
                const bounds = getCompartmentBounds(compIdx);
                return (
                  <React.Fragment key={`comp-${compIdx}`}>
                    {/* Invisible hit mesh covering entire compartment front */}
                    <mesh
                      position={[colCenterX, bounds.centerY, d / 2 + 0.005]}
                      onPointerEnter={() => setHoveredColumnIndex(colIdx)}
                      onPointerLeave={() => setHoveredColumnIndex(null)}
                    >
                      <planeGeometry args={[colInnerW, bounds.height]} />
                      <meshBasicMaterial transparent opacity={0} />
                    </mesh>
                    {/* Label */}
                    <Html
                      position={[
                        colCenterX,
                        getCompartmentCenterY(compIdx),
                        d / 2 + 0.01,
                      ]}
                      center
                      style={{ pointerEvents: "none" }}
                    >
                      <div
                        style={{
                          display: "flex",
                          flexDirection: "column",
                          alignItems: "center",
                          gap: 2,
                          pointerEvents: "none",
                        }}
                      >
                        <span
                          style={{
                            fontSize: 24,
                            fontWeight: "bold",
                            color: "#333",
                          }}
                        >
                          {`${colLetter}${compIdx + 1}`}
                        </span>
                        <span style={{ fontSize: 14, color: "#666" }}>
                          {`${getCompartmentHeightCm(compIdx)}cm`}
                        </span>
                      </div>
                    </Html>
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

        {/* Internal seams (2 panels each) + drag handles - height = MAX of adjacent columns */}
        {columns.slice(0, -1).map((col, idx) => {
          const seamX = col.end; // Right edge of this column = seam position
          const leftH = getColumnHeight(idx);
          const rightH = getColumnHeight(idx + 1);
          const seamH = Math.max(leftH, rightH);

          // Calculate min/max X for this seam based on adjacent columns
          const leftCol = columns[idx];
          const rightCol = columns[idx + 1];
          const minX = leftCol.start + minColWidth + t;
          const maxX = rightCol.end - minColWidth - t;

          return (
            <React.Fragment key={`seam-${idx}`}>
              {/* Left seam panel */}
              <Panel
                position={[seamX - t / 2, seamH / 2, carcassZ]}
                size={[t, seamH, carcassD]}
              />
              {/* Right seam panel */}
              <Panel
                position={[seamX + t / 2, seamH / 2, carcassZ]}
                size={[t, seamH, carcassD]}
              />
              {/* Drag handle */}
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
