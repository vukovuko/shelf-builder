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
  const columnModuleBoundaries = useShelfStore(
    (s) => s.columnModuleBoundaries,
  );
  const setColumnHeight = useShelfStore((s) => s.setColumnHeight);
  const setColumnShelfCount = useShelfStore((s) => s.setColumnShelfCount);
  const setVerticalBoundary = useShelfStore((s) => s.setVerticalBoundary);
  const setVerticalBoundaries = useShelfStore((s) => s.setVerticalBoundaries);
  const materials = useShelfStore((s) => s.materials);
  const selectedMaterialId = useShelfStore((s) => s.selectedMaterialId);
  const columnTopModuleShelves = useShelfStore((s) => s.columnTopModuleShelves);
  const setColumnTopModuleShelfCount = useShelfStore(
    (s) => s.setColumnTopModuleShelfCount,
  );

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

  // Position below wardrobe - moved further down for visibility
  const barY = -0.45;

  // Column letter for display
  const columnLetter = String.fromCharCode(65 + displayColumn);

  const currentHeightCm = columnHeights[displayColumn] ?? height;
  const shelfCount = (columnHorizontalBoundaries[displayColumn] || []).length;

  // Get panel thickness for shelf distribution
  const material =
    materials.find((m) => String(m.id) === String(selectedMaterialId)) ||
    materials[0];
  const panelThicknessM = ((material?.thickness ?? 18) as number) / 1000;

  // Module boundary info
  const moduleBoundary = columnModuleBoundaries[displayColumn] ?? null;
  const hasModuleBoundary = moduleBoundary !== null && currentHeightCm > 200;

  // Effective height for shelves = bottom module height (if module boundary exists)
  const bottomModuleHeightCm = hasModuleBoundary
    ? Math.round(moduleBoundary * 100)
    : currentHeightCm;

  // Calculate limits - shelves go in bottom module only
  const minHeightForCurrentShelves = getMinColumnHeightCm(shelfCount);
  const maxShelves = getMaxShelvesForHeight(bottomModuleHeightCm);

  const canDecreaseHeight = currentHeightCm > minHeightForCurrentShelves;
  const canIncreaseHeight = currentHeightCm < MAX_COLUMN_HEIGHT_CM;
  const canDecreaseShelves = shelfCount > 0;
  const canIncreaseShelves = shelfCount < maxShelves;

  // Top module shelf calculations
  const topModuleShelfCount = (columnTopModuleShelves[displayColumn] || []).length;
  const topModuleHeightCm = hasModuleBoundary
    ? Math.round(currentHeightCm - moduleBoundary * 100)
    : 0;
  const maxTopModuleShelves = hasModuleBoundary
    ? getMaxShelvesForHeight(topModuleHeightCm)
    : 0;
  const canDecreaseTopShelves = topModuleShelfCount > 0;
  const canIncreaseTopShelves = topModuleShelfCount < maxTopModuleShelves;

  const handleHeightChange = (delta: number) => {
    const newHeight = currentHeightCm + delta;
    // Allow decreasing even if above max (to bring back into valid range)
    // Only block increasing above max
    if (
      newHeight >= minHeightForCurrentShelves &&
      (delta < 0 || newHeight <= MAX_COLUMN_HEIGHT_CM)
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

  const handleTopModuleShelfCountChange = (delta: number) => {
    const newCount = topModuleShelfCount + delta;
    if (newCount >= 0 && newCount <= maxTopModuleShelves) {
      setColumnTopModuleShelfCount(displayColumn, newCount, panelThicknessM);
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
          padding: "4px 0 2px 0",
          minWidth: 180,
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

        {/* Controls - responsive layout */}
        <div
          className="column-controls-grid"
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 6,
            padding: "4px 12px 8px 12px",
          }}
        >
          {/* Width control - only show if multiple columns */}
          {hasMultipleColumns && (
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: 8,
              }}
            >
              <span style={{ fontSize: 12, color: "#000000", minWidth: 50 }}>
                Širina
              </span>
              <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                <button
                  style={{
                    width: 24,
                    height: 24,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    border: "1px solid #cccccc",
                    borderRadius: "var(--radius)",
                    background: "#f5f5f5",
                    color: "#000000",
                    fontSize: 14,
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
                    minWidth: 50,
                    textAlign: "center",
                    fontSize: 12,
                    fontWeight: 500,
                    color: "#000000",
                  }}
                >
                  {currentWidthCm} cm
                </span>
                <button
                  style={{
                    width: 24,
                    height: 24,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    border: "1px solid #cccccc",
                    borderRadius: "var(--radius)",
                    background: "#f5f5f5",
                    color: "#000000",
                    fontSize: 14,
                    cursor: canIncreaseWidth ? "pointer" : "not-allowed",
                    opacity: canIncreaseWidth ? 1 : 0.4,
                  }}
                  onClick={() => handleWidthChange(1)}
                  disabled={!canIncreaseWidth}
                >
                  +
                </button>
              </div>
            </div>
          )}

          {/* Height control */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 8,
            }}
          >
            <span style={{ fontSize: 12, color: "#000000", minWidth: 50 }}>
              Visina
            </span>
            <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
              <button
                style={{
                  width: 24,
                  height: 24,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  border: "1px solid #cccccc",
                  borderRadius: "var(--radius)",
                  background: "#f5f5f5",
                  color: "#000000",
                  fontSize: 14,
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
                  minWidth: 50,
                  textAlign: "center",
                  fontSize: 12,
                  fontWeight: 500,
                  color: "#000000",
                }}
              >
                {Math.round(currentHeightCm)} cm
              </span>
              <button
                style={{
                  width: 24,
                  height: 24,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  border: "1px solid #cccccc",
                  borderRadius: "var(--radius)",
                  background: "#f5f5f5",
                  color: "#000000",
                  fontSize: 14,
                  cursor: canIncreaseHeight ? "pointer" : "not-allowed",
                  opacity: canIncreaseHeight ? 1 : 0.4,
                }}
                onClick={() => handleHeightChange(1)}
                disabled={!canIncreaseHeight}
              >
                +
              </button>
            </div>
          </div>

          {/* Shelf count control (bottom module when split exists) */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 8,
            }}
          >
            <span style={{ fontSize: 12, color: "#000000", minWidth: 50 }}>
              {hasModuleBoundary ? "Police ↓" : "Police"}
            </span>
            <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
              <button
                style={{
                  width: 24,
                  height: 24,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  border: "1px solid #cccccc",
                  borderRadius: "var(--radius)",
                  background: "#f5f5f5",
                  color: "#000000",
                  fontSize: 14,
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
                  minWidth: 50,
                  textAlign: "center",
                  fontSize: 12,
                  fontWeight: 500,
                  color: "#000000",
                }}
              >
                {shelfCount}
              </span>
              <button
                style={{
                  width: 24,
                  height: 24,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  border: "1px solid #cccccc",
                  borderRadius: "var(--radius)",
                  background: "#f5f5f5",
                  color: "#000000",
                  fontSize: 14,
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

          {/* Top module shelf count control - only show when module boundary exists */}
          {hasModuleBoundary && (
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: 8,
              }}
            >
              <span style={{ fontSize: 12, color: "#000000", minWidth: 50 }}>
                Police ↑
              </span>
              <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                <button
                  style={{
                    width: 24,
                    height: 24,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    border: "1px solid #cccccc",
                    borderRadius: "var(--radius)",
                    background: "#f5f5f5",
                    color: "#000000",
                    fontSize: 14,
                    cursor: canDecreaseTopShelves ? "pointer" : "not-allowed",
                    opacity: canDecreaseTopShelves ? 1 : 0.4,
                  }}
                  onClick={() => handleTopModuleShelfCountChange(-1)}
                  disabled={!canDecreaseTopShelves}
                >
                  -
                </button>
                <span
                  style={{
                    minWidth: 50,
                    textAlign: "center",
                    fontSize: 12,
                    fontWeight: 500,
                    color: "#000000",
                  }}
                >
                  {topModuleShelfCount}
                </span>
                <button
                  style={{
                    width: 24,
                    height: 24,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    border: "1px solid #cccccc",
                    borderRadius: "var(--radius)",
                    background: "#f5f5f5",
                    color: "#000000",
                    fontSize: 14,
                    cursor: canIncreaseTopShelves ? "pointer" : "not-allowed",
                    opacity: canIncreaseTopShelves ? 1 : 0.4,
                  }}
                  onClick={() => handleTopModuleShelfCountChange(1)}
                  disabled={!canIncreaseTopShelves}
                >
                  +
                </button>
              </div>
            </div>
          )}

          {/* Module boundary info - only show when there's a module split */}
          {hasModuleBoundary && (
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: 8,
                borderTop: "1px solid #e0e0e0",
                paddingTop: 6,
                marginTop: 2,
              }}
            >
              <span style={{ fontSize: 12, color: "#cc5500", minWidth: 50 }}>
                Modul
              </span>
              <span
                style={{
                  fontSize: 12,
                  fontWeight: 500,
                  color: "#cc5500",
                }}
              >
                {Math.round(moduleBoundary * 100)} + {Math.round(currentHeightCm - moduleBoundary * 100)} cm
              </span>
            </div>
          )}
        </div>
      </div>
    </Html>
  );
}
