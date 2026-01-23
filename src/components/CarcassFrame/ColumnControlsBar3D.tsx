"use client";

import { Html } from "@react-three/drei";
import { useRef, useState, useEffect, useCallback } from "react";
import { useShelfStore } from "@/lib/store";
import { buildBlocksX, getDefaultBoundariesX } from "@/lib/wardrobe-utils";
import {
  getMinColumnHeightCm,
  getMaxShelvesForHeight,
  MAX_COLUMN_HEIGHT_CM,
} from "@/lib/wardrobe-constants";

interface ColumnControlsBar3DProps {
  depth: number; // wardrobe depth in meters
}

/**
 * ColumnControlsBar3D - Positioned in 3D space below the wardrobe
 * Uses Html component so it follows camera rotation/zoom
 */
export function ColumnControlsBar3D({ depth }: ColumnControlsBar3DProps) {
  const hoveredColumnIndex = useShelfStore((s) => s.hoveredColumnIndex);
  const setHoveredColumnIndex = useShelfStore((s) => s.setHoveredColumnIndex);
  const width = useShelfStore((s) => s.width);
  const height = useShelfStore((s) => s.height);
  const verticalBoundaries = useShelfStore((s) => s.verticalBoundaries);
  const columnHeights = useShelfStore((s) => s.columnHeights);
  const columnHorizontalBoundaries = useShelfStore(
    (s) => s.columnHorizontalBoundaries,
  );
  const setColumnHeight = useShelfStore((s) => s.setColumnHeight);
  const setColumnShelfCount = useShelfStore((s) => s.setColumnShelfCount);
  const setVerticalBoundary = useShelfStore((s) => s.setVerticalBoundary);
  const setVerticalBoundaries = useShelfStore((s) => s.setVerticalBoundaries);
  const materials = useShelfStore((s) => s.materials);
  const selectedMaterialId = useShelfStore((s) => s.selectedMaterialId);

  // Track if mouse is over the bar
  const isBarHoveredRef = useRef(false);
  // Store the last active column to show while transitioning
  const [activeColumn, setActiveColumn] = useState<number | null>(null);
  // Timeout ref for delayed hide
  const hideTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Update activeColumn when hoveredColumnIndex changes
  useEffect(() => {
    if (hoveredColumnIndex !== null) {
      if (hideTimeoutRef.current) {
        clearTimeout(hideTimeoutRef.current);
        hideTimeoutRef.current = null;
      }
      setActiveColumn(hoveredColumnIndex);
    } else {
      hideTimeoutRef.current = setTimeout(() => {
        if (!isBarHoveredRef.current) {
          setActiveColumn(null);
        }
      }, 150);
    }
    return () => {
      if (hideTimeoutRef.current) {
        clearTimeout(hideTimeoutRef.current);
      }
    };
  }, [hoveredColumnIndex]);

  const handleBarMouseEnter = useCallback(() => {
    isBarHoveredRef.current = true;
    if (hideTimeoutRef.current) {
      clearTimeout(hideTimeoutRef.current);
      hideTimeoutRef.current = null;
    }
    // Keep the column active when hovering over bar
    if (activeColumn !== null) {
      setHoveredColumnIndex(activeColumn);
    }
  }, [activeColumn, setHoveredColumnIndex]);

  const handleBarMouseLeave = useCallback(() => {
    isBarHoveredRef.current = false;
    if (hoveredColumnIndex === null) {
      setActiveColumn(null);
    }
  }, [hoveredColumnIndex]);

  const displayColumn = activeColumn;

  if (displayColumn === null) return null;

  // Calculate column X position
  const w = width / 100;
  const defaultBoundaries = getDefaultBoundariesX(w);
  const activeBoundaries =
    verticalBoundaries.length > 0 ? verticalBoundaries : defaultBoundaries;
  const columns = buildBlocksX(
    w,
    activeBoundaries.length > 0 ? activeBoundaries : undefined,
  );

  if (!columns[displayColumn]) return null;

  const col = columns[displayColumn];
  const colCenterX = (col.start + col.end) / 2;

  // Position below wardrobe - moved further down for mobile visibility
  const barY = -0.28;

  // Column letter for display
  const columnLetter = String.fromCharCode(65 + displayColumn);

  const currentHeightCm = columnHeights[displayColumn] ?? height;
  const shelfCount = (columnHorizontalBoundaries[displayColumn] || []).length;

  // Get panel thickness for shelf distribution
  const material =
    materials.find((m) => String(m.id) === String(selectedMaterialId)) ||
    materials[0];
  const panelThicknessM = ((material?.thickness ?? 18) as number) / 1000;

  // Calculate limits
  const minHeightForCurrentShelves = getMinColumnHeightCm(shelfCount);
  const maxShelves = getMaxShelvesForHeight(currentHeightCm);

  const canDecreaseHeight = currentHeightCm > minHeightForCurrentShelves;
  const canIncreaseHeight = currentHeightCm < MAX_COLUMN_HEIGHT_CM;
  const canDecreaseShelves = shelfCount > 0;
  const canIncreaseShelves = shelfCount < maxShelves;

  const handleHeightChange = (delta: number) => {
    const newHeight = currentHeightCm + delta;
    if (
      newHeight >= minHeightForCurrentShelves &&
      newHeight <= MAX_COLUMN_HEIGHT_CM
    ) {
      setColumnHeight(displayColumn, newHeight);
    }
  };

  const handleShelfCountChange = (delta: number) => {
    const newCount = shelfCount + delta;
    if (newCount >= 0 && newCount <= maxShelves) {
      setColumnShelfCount(displayColumn, newCount, panelThicknessM);
    }
  };

  // === Width control logic ===
  const hasMultipleColumns = columns.length > 1;
  const currentWidthCm = Math.round(col.width * 100);

  // Width constraints
  const minWidthCm = 20;
  const maxWidthCm = 100;

  // Determine which seam to adjust
  const isLastColumn = displayColumn === columns.length - 1;
  const seamIndex = isLastColumn ? displayColumn - 1 : displayColumn;

  // Check adjacent column constraints
  const adjacentColIndex = isLastColumn ? displayColumn - 1 : displayColumn + 1;
  const adjacentCol = columns[adjacentColIndex];
  const adjacentWidthCm = adjacentCol ? Math.round(adjacentCol.width * 100) : 0;

  // Can increase if current < max AND adjacent > min
  const canIncreaseWidth =
    hasMultipleColumns &&
    currentWidthCm < maxWidthCm &&
    adjacentWidthCm > minWidthCm;
  // Can decrease if current > min AND adjacent < max
  const canDecreaseWidth =
    hasMultipleColumns &&
    currentWidthCm > minWidthCm &&
    adjacentWidthCm < maxWidthCm;

  const handleWidthChange = (delta: number) => {
    if (!hasMultipleColumns) return;

    const newWidthCm = currentWidthCm + delta;
    if (newWidthCm < minWidthCm || newWidthCm > maxWidthCm) return;

    // Check adjacent column won't violate constraints
    const newAdjacentWidthCm = adjacentWidthCm - delta;
    if (newAdjacentWidthCm < minWidthCm || newAdjacentWidthCm > maxWidthCm)
      return;

    // If no custom boundaries exist, initialize from defaults first
    let boundariesToUse = activeBoundaries;
    if (verticalBoundaries.length === 0 && defaultBoundaries.length > 0) {
      setVerticalBoundaries(defaultBoundaries);
      boundariesToUse = defaultBoundaries;
    }

    // Calculate new seam position
    // For non-last column: + delta moves seam right
    // For last column: + delta moves seam left (opposite direction)
    const seamDeltaM = (isLastColumn ? -delta : delta) / 100;
    const currentSeamX = boundariesToUse[seamIndex];
    const newSeamX = currentSeamX + seamDeltaM;

    setVerticalBoundary(seamIndex, newSeamX);
  };

  return (
    <Html
      position={[colCenterX, barY, depth / 2]}
      center
      zIndexRange={[1, 10]}
      style={{ pointerEvents: "auto" }}
    >
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          background: "#ffffff",
          borderRadius: "var(--radius)",
          boxShadow: "var(--shadow-lg)",
          border: "1px solid #e0e0e0",
          padding: "4px 0 6px 0",
          minWidth: 200,
          color: "#000000",
        }}
        onMouseEnter={handleBarMouseEnter}
        onMouseLeave={handleBarMouseLeave}
      >
        {/* Arrow indicator pointing up */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            marginTop: -12,
          }}
        >
          <div
            style={{
              width: 0,
              height: 0,
              borderLeft: "10px solid transparent",
              borderRight: "10px solid transparent",
              borderBottom: "10px solid #ffffff",
            }}
          />
          <span
            style={{
              fontSize: 11,
              fontWeight: "bold",
              color: "#000000",
              marginTop: 2,
            }}
          >
            {columnLetter}
          </span>
        </div>

        {/* Controls row */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 8,
            padding: "4px 8px",
          }}
        >
          {/* Width control - only show if multiple columns */}
          {hasMultipleColumns && (
            <div style={{ display: "flex", alignItems: "center", gap: 3 }}>
              <span style={{ fontSize: 11, color: "#000000" }}>Š</span>
              <button
                style={{
                  width: 20,
                  height: 20,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  border: "1px solid #cccccc",
                  borderRadius: "var(--radius)",
                  background: "#f5f5f5",
                  color: "#000000",
                  fontSize: 12,
                  cursor: canDecreaseWidth ? "pointer" : "not-allowed",
                  opacity: canDecreaseWidth ? 1 : 0.4,
                }}
                onClick={() => handleWidthChange(-1)}
                disabled={!canDecreaseWidth}
              >
                -
              </button>
              <span
                style={{
                  minWidth: 36,
                  textAlign: "center",
                  fontSize: 11,
                  fontWeight: 500,
                  color: "#000000",
                }}
              >
                {currentWidthCm}
              </span>
              <button
                style={{
                  width: 20,
                  height: 20,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  border: "1px solid #cccccc",
                  borderRadius: "var(--radius)",
                  background: "#f5f5f5",
                  color: "#000000",
                  fontSize: 12,
                  cursor: canIncreaseWidth ? "pointer" : "not-allowed",
                  opacity: canIncreaseWidth ? 1 : 0.4,
                }}
                onClick={() => handleWidthChange(1)}
                disabled={!canIncreaseWidth}
              >
                +
              </button>
            </div>
          )}

          {/* Height control */}
          <div style={{ display: "flex", alignItems: "center", gap: 3 }}>
            <span style={{ fontSize: 11, color: "#000000" }}>V</span>
            <button
              style={{
                width: 20,
                height: 20,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                border: "1px solid #cccccc",
                borderRadius: "var(--radius)",
                background: "#f5f5f5",
                color: "#000000",
                fontSize: 12,
                cursor: canDecreaseHeight ? "pointer" : "not-allowed",
                opacity: canDecreaseHeight ? 1 : 0.4,
              }}
              onClick={() => handleHeightChange(-1)}
              disabled={!canDecreaseHeight}
            >
              -
            </button>
            <span
              style={{
                minWidth: 36,
                textAlign: "center",
                fontSize: 11,
                fontWeight: 500,
                color: "#000000",
              }}
            >
              {Math.round(currentHeightCm)}
            </span>
            <button
              style={{
                width: 20,
                height: 20,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                border: "1px solid #cccccc",
                borderRadius: "var(--radius)",
                background: "#f5f5f5",
                color: "#000000",
                fontSize: 12,
                cursor: canIncreaseHeight ? "pointer" : "not-allowed",
                opacity: canIncreaseHeight ? 1 : 0.4,
              }}
              onClick={() => handleHeightChange(1)}
              disabled={!canIncreaseHeight}
            >
              +
            </button>
          </div>

          {/* Shelf count control */}
          <div style={{ display: "flex", alignItems: "center", gap: 3 }}>
            <span style={{ fontSize: 11, color: "#000000" }}>P</span>
            <button
              style={{
                width: 20,
                height: 20,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                border: "1px solid #cccccc",
                borderRadius: "var(--radius)",
                background: "#f5f5f5",
                color: "#000000",
                fontSize: 12,
                cursor: canDecreaseShelves ? "pointer" : "not-allowed",
                opacity: canDecreaseShelves ? 1 : 0.4,
              }}
              onClick={() => handleShelfCountChange(-1)}
              disabled={!canDecreaseShelves}
            >
              -
            </button>
            <span
              style={{
                minWidth: 16,
                textAlign: "center",
                fontSize: 11,
                fontWeight: 500,
                color: "#000000",
              }}
            >
              {shelfCount}
            </span>
            <button
              style={{
                width: 20,
                height: 20,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                border: "1px solid #cccccc",
                borderRadius: "var(--radius)",
                background: "#f5f5f5",
                color: "#000000",
                fontSize: 12,
                cursor: canIncreaseShelves ? "pointer" : "not-allowed",
                opacity: canIncreaseShelves ? 1 : 0.4,
              }}
              onClick={() => handleShelfCountChange(1)}
              disabled={!canIncreaseShelves}
            >
              +
            </button>
          </div>
        </div>
      </div>
    </Html>
  );
}
