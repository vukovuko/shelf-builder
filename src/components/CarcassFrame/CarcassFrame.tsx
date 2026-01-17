"use client";

import { Html } from "@react-three/drei";
import React from "react";
import { useShelfStore } from "@/lib/store";
import {
  buildBlocksX,
  toLetters,
  getDefaultBoundariesX,
} from "@/lib/wardrobe-utils";
import { Panel } from "@/components/Panel";
import { SeamHandle } from "./SeamHandle";
import { HorizontalSplitHandle } from "./HorizontalSplitHandle";

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
 * Each column gets its own Top/Bottom panel, seams are rendered as 2 panels
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
    const setColumnHorizontalBoundary = useShelfStore(
      (state) => state.setColumnHorizontalBoundary,
    );

    // Convert cm to meters
    const w = width / 100;
    const h = height / 100;
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

    // Min column width (20cm = 0.2m)
    const minColWidth = 0.2;
    // Min compartment height (20cm = 0.2m)
    const minCompHeight = 0.2;
    // Height threshold for horizontal splits (200cm = 2m)
    const splitThreshold = 2.0;

    // Check if height allows horizontal splits
    const canHaveSplits = h > splitThreshold;

    // Track which columns we've initialized to avoid re-running
    const initializedColumnsRef = React.useRef<Set<number>>(new Set());

    // Auto-initialize horizontal splits when height > 200cm
    React.useEffect(() => {
      if (!canHaveSplits) {
        initializedColumnsRef.current.clear();
        return;
      }

      columns.forEach((_, colIdx) => {
        const alreadyInitialized = initializedColumnsRef.current.has(colIdx);
        const hasValue = columnHorizontalBoundaries[colIdx] !== undefined;

        if (!alreadyInitialized && !hasValue) {
          setColumnHorizontalBoundary(colIdx, 0);
          initializedColumnsRef.current.add(colIdx);
        }
      });
    }, [
      canHaveSplits,
      columns,
      columnHorizontalBoundaries,
      setColumnHorizontalBoundary,
    ]);

    React.useImperativeHandle(ref, () => ({
      toggleAllInfo: () => {},
    }));

    if (materials.length === 0) return null;

    return (
      <group position={[0, h / 2, 0]}>
        {/* Side L */}
        <Panel
          position={[-w / 2 + t / 2, 0, carcassZ]}
          size={[t, h, carcassD]}
        />

        {/* Side R */}
        <Panel
          position={[w / 2 - t / 2, 0, carcassZ]}
          size={[t, h, carcassD]}
        />

        {/* Per-column Top & Bottom panels + Horizontal splits + Labels */}
        {columns.map((col, colIdx) => {
          const colCenterX = (col.start + col.end) / 2;
          // Each column loses t on left and t on right (to Side panels or seam panels)
          const colInnerW = col.width - 2 * t;

          // Check if this column has a horizontal split
          const splitY = canHaveSplits
            ? columnHorizontalBoundaries[colIdx]
            : undefined;
          const hasSplit = splitY != null;

          // Calculate min/max Y for the split handle
          const minY = -h / 2 + t + minCompHeight; // Above bottom panel + min height
          const maxY = h / 2 - t - minCompHeight; // Below top panel - min height

          // Calculate label indices
          // Bottom row gets labels 0, 1, 2... (A, B, C)
          // Top row gets labels numColumns, numColumns+1... (D, E, F)
          const bottomLabelIdx = colIdx;
          const topLabelIdx = columns.length + colIdx;

          if (hasSplit) {
            // Calculate compartment centers for labels
            const bottomCompCenterY = (-h / 2 + t + splitY - t) / 2;
            const topCompCenterY = (splitY + t + h / 2 - t) / 2;

            return (
              <React.Fragment key={`col-${colIdx}`}>
                {/* Top panel of column */}
                <Panel
                  position={[colCenterX, h / 2 - t / 2, carcassZ]}
                  size={[colInnerW, t, carcassD]}
                />
                {/* Bottom panel of column */}
                <Panel
                  position={[colCenterX, -h / 2 + t / 2, carcassZ]}
                  size={[colInnerW, t, carcassD]}
                />

                {/* Horizontal split panels (2 panels like vertical seams) */}
                <Panel
                  position={[colCenterX, splitY - t / 2, carcassZ]}
                  size={[colInnerW, t, carcassD]}
                />
                <Panel
                  position={[colCenterX, splitY + t / 2, carcassZ]}
                  size={[colInnerW, t, carcassD]}
                />

                {/* Horizontal split drag handle */}
                <HorizontalSplitHandle
                  columnIndex={colIdx}
                  x={colCenterX}
                  y={splitY}
                  depth={d}
                  colWidth={colInnerW}
                  minY={minY}
                  maxY={maxY}
                  parentYOffset={h / 2}
                />

                {/* Bottom compartment label */}
                <Html
                  position={[colCenterX, bottomCompCenterY, d / 2 + 0.01]}
                  center
                >
                  <div
                    style={{ fontSize: 24, fontWeight: "bold", color: "#333" }}
                  >
                    {toLetters(bottomLabelIdx)}
                  </div>
                </Html>

                {/* Top compartment label */}
                <Html
                  position={[colCenterX, topCompCenterY, d / 2 + 0.01]}
                  center
                >
                  <div
                    style={{ fontSize: 24, fontWeight: "bold", color: "#333" }}
                  >
                    {toLetters(topLabelIdx)}
                  </div>
                </Html>
              </React.Fragment>
            );
          }

          // No split - single compartment
          return (
            <React.Fragment key={`col-${colIdx}`}>
              {/* Top panel */}
              <Panel
                position={[colCenterX, h / 2 - t / 2, carcassZ]}
                size={[colInnerW, t, carcassD]}
              />
              {/* Bottom panel */}
              <Panel
                position={[colCenterX, -h / 2 + t / 2, carcassZ]}
                size={[colInnerW, t, carcassD]}
              />
              {/* Label */}
              <Html position={[colCenterX, 0, d / 2 + 0.01]} center>
                <div
                  style={{ fontSize: 24, fontWeight: "bold", color: "#333" }}
                >
                  {toLetters(bottomLabelIdx)}
                </div>
              </Html>
            </React.Fragment>
          );
        })}

        {/* Internal seams (2 panels each for correct edge rendering) + drag handles */}
        {columns.slice(0, -1).map((col, idx) => {
          const seamX = col.end; // Right edge of this column = seam position
          // Calculate min/max X for this seam based on adjacent columns
          const leftCol = columns[idx];
          const rightCol = columns[idx + 1];
          const minX = leftCol.start + minColWidth + t; // Left column needs min width
          const maxX = rightCol.end - minColWidth - t; // Right column needs min width

          return (
            <React.Fragment key={`seam-${idx}`}>
              {/* Left seam panel */}
              <Panel
                position={[seamX - t / 2, 0, carcassZ]}
                size={[t, h, carcassD]}
              />
              {/* Right seam panel */}
              <Panel
                position={[seamX + t / 2, 0, carcassZ]}
                size={[t, h, carcassD]}
              />
              {/* Drag handle */}
              <SeamHandle
                seamIndex={idx}
                x={seamX}
                height={h}
                depth={d}
                minX={minX}
                maxX={maxX}
              />
            </React.Fragment>
          );
        })}

        {/* Back panel - full width */}
        <Panel position={[0, 0, -d / 2 + backT / 2]} size={[w, h, backT]} />
      </group>
    );
  },
);

export default CarcassFrame;
