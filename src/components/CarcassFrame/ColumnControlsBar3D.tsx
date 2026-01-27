"use client";

import { Html } from "@react-three/drei";
import { useRef, useState, useEffect, useCallback } from "react";
import { useShelfStore, type ShelfState, type Material } from "@/lib/store";
import { buildBlocksX, getDefaultBoundariesX } from "@/lib/wardrobe-utils";
import {
  getMinColumnHeightCm,
  getMaxShelvesForHeight,
  MAX_COLUMN_HEIGHT_CM,
  MAX_SEGMENT_X_CM,
  TARGET_BOTTOM_HEIGHT,
} from "@/lib/wardrobe-constants";

interface ColumnControlsBar3DProps {
  depth: number; // wardrobe depth in meters
}

/**
 * ColumnControlsBar3D - Positioned in 3D space below the wardrobe
 * Uses Html component so it follows camera rotation/zoom
 */
export function ColumnControlsBar3D({ depth }: ColumnControlsBar3DProps) {
  const hoveredColumnIndex = useShelfStore(
    (s: ShelfState) => s.hoveredColumnIndex,
  );
  const setHoveredColumnIndex = useShelfStore(
    (s: ShelfState) => s.setHoveredColumnIndex,
  );
  const width = useShelfStore((s: ShelfState) => s.width);
  const height = useShelfStore((s: ShelfState) => s.height);
  const verticalBoundaries = useShelfStore(
    (s: ShelfState) => s.verticalBoundaries,
  );
  const columnHeights = useShelfStore((s: ShelfState) => s.columnHeights);
  const columnHorizontalBoundaries = useShelfStore(
    (s: ShelfState) => s.columnHorizontalBoundaries,
  );
  const columnModuleBoundaries = useShelfStore(
    (s: ShelfState) => s.columnModuleBoundaries,
  );
  const setColumnHeight = useShelfStore((s: ShelfState) => s.setColumnHeight);
  const setColumnShelfCount = useShelfStore(
    (s: ShelfState) => s.setColumnShelfCount,
  );
  const setVerticalBoundary = useShelfStore(
    (s: ShelfState) => s.setVerticalBoundary,
  );
  const setVerticalBoundaries = useShelfStore(
    (s: ShelfState) => s.setVerticalBoundaries,
  );
  const materials = useShelfStore((s: ShelfState) => s.materials);
  const selectedMaterialId = useShelfStore(
    (s: ShelfState) => s.selectedMaterialId,
  );
  const columnTopModuleShelves = useShelfStore(
    (s: ShelfState) => s.columnTopModuleShelves,
  );
  const setColumnTopModuleShelfCount = useShelfStore(
    (s: ShelfState) => s.setColumnTopModuleShelfCount,
  );
  const moveColumnModuleBoundary = useShelfStore(
    (s: ShelfState) => s.moveColumnModuleBoundary,
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

  // Position bar below wardrobe bottom
  // Dynamic gap: base gap + extra for taller wardrobes
  // Anchored at TOP of HTML (no center prop), so it only extends DOWN
  const maxHeightM =
    Math.max(
      height,
      ...Object.values(columnHeights).filter(
        (h): h is number => h !== undefined,
      ),
    ) / 100;
  const BASE_GAP = 0.15; // 15cm base gap
  const HEIGHT_FACTOR = 0.08; // 8cm extra per meter above split threshold
  const extraGap = Math.max(
    0,
    (maxHeightM - TARGET_BOTTOM_HEIGHT) * HEIGHT_FACTOR,
  );
  const barY = -(BASE_GAP + extraGap);

  const currentHeightCm = columnHeights[displayColumn] ?? height;
  const shelfCount = (columnHorizontalBoundaries[displayColumn] || []).length;

  // Get panel thickness for shelf distribution
  const material =
    materials.find(
      (m: Material) => String(m.id) === String(selectedMaterialId),
    ) || materials[0];
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
  const topModuleShelfCount = (columnTopModuleShelves[displayColumn] || [])
    .length;
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

  // Module height constraints (both modules must stay within these)
  const minModuleHeightCm = 20;
  const maxModuleHeightCm = 200;

  // Can increase/decrease module heights (linked - one increases, other decreases)
  const canIncreaseBottomHeight =
    hasModuleBoundary &&
    bottomModuleHeightCm < maxModuleHeightCm &&
    topModuleHeightCm > minModuleHeightCm;
  const canDecreaseBottomHeight =
    hasModuleBoundary &&
    bottomModuleHeightCm > minModuleHeightCm &&
    topModuleHeightCm < maxModuleHeightCm;
  const canIncreaseTopHeight = canDecreaseBottomHeight; // Inverse
  const canDecreaseTopHeight = canIncreaseBottomHeight; // Inverse

  const handleModuleHeightChange = (
    module: "bottom" | "top",
    newHeightCm: number,
  ) => {
    if (!hasModuleBoundary) return;

    let newBoundaryY: number;
    if (module === "bottom") {
      // Bottom module height = boundary position (in meters)
      newBoundaryY =
        Math.max(minModuleHeightCm, Math.min(maxModuleHeightCm, newHeightCm)) /
        100;
      // Ensure top module also stays valid
      const topWouldBe = currentHeightCm - newBoundaryY * 100;
      if (topWouldBe < minModuleHeightCm) {
        newBoundaryY = (currentHeightCm - minModuleHeightCm) / 100;
      }
      if (topWouldBe > maxModuleHeightCm) {
        newBoundaryY = (currentHeightCm - maxModuleHeightCm) / 100;
      }
    } else {
      // Top module height change → adjust boundary inversely
      const clampedTopHeight = Math.max(
        minModuleHeightCm,
        Math.min(maxModuleHeightCm, newHeightCm),
      );
      newBoundaryY = (currentHeightCm - clampedTopHeight) / 100;
      // Ensure bottom module stays valid
      if (newBoundaryY * 100 < minModuleHeightCm) {
        newBoundaryY = minModuleHeightCm / 100;
      }
      if (newBoundaryY * 100 > maxModuleHeightCm) {
        newBoundaryY = maxModuleHeightCm / 100;
      }
    }

    moveColumnModuleBoundary(displayColumn, newBoundaryY);
  };

  // === Width control logic ===
  const hasMultipleColumns = columns.length > 1;
  const currentWidthCm = Math.round(col.width * 100);

  // Width constraints
  const minWidthCm = 20;
  const maxWidthCm = MAX_SEGMENT_X_CM;

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
      // NO center prop - anchor at top-left, HTML extends DOWN only
      zIndexRange={[1, 10]}
      style={{
        pointerEvents: "auto",
        transform: "translateX(-50%)", // Center horizontally only
      }}
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
          minWidth: hasModuleBoundary ? 320 : 180,
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
        </div>

        {/* Controls - split layout when two modules exist */}
        {hasModuleBoundary ? (
          // SPLIT LAYOUT: Two modules side by side
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: 6,
              padding: "4px 8px 8px 8px",
            }}
          >
            {/* Total height control at top */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 6,
                paddingBottom: 6,
                borderBottom: "1px solid #e0e0e0",
              }}
            >
              <span style={{ fontSize: 11, color: "#666" }}>
                Ukupna visina:
              </span>
              <button
                style={{
                  width: 22,
                  height: 22,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  border: "1px solid #ccc",
                  borderRadius: 4,
                  background: "#f5f5f5",
                  fontSize: 13,
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
                  fontSize: 11,
                  fontWeight: 600,
                  minWidth: 45,
                  textAlign: "center",
                }}
              >
                {Math.round(currentHeightCm)}cm
              </span>
              <button
                style={{
                  width: 22,
                  height: 22,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  border: "1px solid #ccc",
                  borderRadius: 4,
                  background: "#f5f5f5",
                  fontSize: 13,
                  cursor: canIncreaseHeight ? "pointer" : "not-allowed",
                  opacity: canIncreaseHeight ? 1 : 0.4,
                }}
                onClick={() => handleHeightChange(1)}
                disabled={!canIncreaseHeight}
              >
                +
              </button>
            </div>

            {/* Two modules side by side */}
            <div style={{ display: "flex", gap: 0 }}>
              {/* LEFT: Donji modul */}
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: 4,
                  paddingRight: 12,
                  borderRight: "1px solid #e0e0e0",
                }}
              >
                <span
                  style={{
                    fontSize: 11,
                    fontWeight: 600,
                    color: "#3b82f6",
                    marginBottom: 2,
                  }}
                >
                  Donji modul
                </span>

                {/* Width control */}
                {hasMultipleColumns && (
                  <div
                    style={{ display: "flex", alignItems: "center", gap: 4 }}
                  >
                    <span style={{ fontSize: 11, color: "#666", width: 42 }}>
                      Širina
                    </span>
                    <button
                      style={{
                        width: 22,
                        height: 22,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        border: "1px solid #ccc",
                        borderRadius: 4,
                        background: "#f5f5f5",
                        fontSize: 13,
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
                        width: 42,
                        textAlign: "center",
                        fontSize: 11,
                        fontWeight: 500,
                      }}
                    >
                      {currentWidthCm}cm
                    </span>
                    <button
                      style={{
                        width: 22,
                        height: 22,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        border: "1px solid #ccc",
                        borderRadius: 4,
                        background: "#f5f5f5",
                        fontSize: 13,
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

                {/* Bottom module height */}
                <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                  <span style={{ fontSize: 11, color: "#666", width: 42 }}>
                    Visina
                  </span>
                  <button
                    style={{
                      width: 22,
                      height: 22,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      border: "1px solid #ccc",
                      borderRadius: 4,
                      background: "#f5f5f5",
                      fontSize: 13,
                      cursor: canDecreaseBottomHeight
                        ? "pointer"
                        : "not-allowed",
                      opacity: canDecreaseBottomHeight ? 1 : 0.4,
                    }}
                    onClick={() =>
                      handleModuleHeightChange(
                        "bottom",
                        bottomModuleHeightCm - 1,
                      )
                    }
                    disabled={!canDecreaseBottomHeight}
                  >
                    -
                  </button>
                  <input
                    type="number"
                    value={bottomModuleHeightCm}
                    onChange={(e) =>
                      handleModuleHeightChange(
                        "bottom",
                        parseInt(e.target.value) || 0,
                      )
                    }
                    min={minModuleHeightCm}
                    max={Math.min(
                      maxModuleHeightCm,
                      currentHeightCm - minModuleHeightCm,
                    )}
                    style={{
                      width: 42,
                      height: 22,
                      textAlign: "center",
                      border: "1px solid #ccc",
                      borderRadius: 4,
                      fontSize: 11,
                      fontWeight: 500,
                      color: "#3b82f6",
                      padding: "2px 4px",
                    }}
                  />
                  <button
                    style={{
                      width: 22,
                      height: 22,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      border: "1px solid #ccc",
                      borderRadius: 4,
                      background: "#f5f5f5",
                      fontSize: 13,
                      cursor: canIncreaseBottomHeight
                        ? "pointer"
                        : "not-allowed",
                      opacity: canIncreaseBottomHeight ? 1 : 0.4,
                    }}
                    onClick={() =>
                      handleModuleHeightChange(
                        "bottom",
                        bottomModuleHeightCm + 1,
                      )
                    }
                    disabled={!canIncreaseBottomHeight}
                  >
                    +
                  </button>
                </div>

                {/* Bottom module shelves */}
                <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                  <span style={{ fontSize: 11, color: "#666", width: 42 }}>
                    Police
                  </span>
                  <button
                    style={{
                      width: 22,
                      height: 22,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      border: "1px solid #ccc",
                      borderRadius: 4,
                      background: "#f5f5f5",
                      fontSize: 13,
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
                      width: 42,
                      textAlign: "center",
                      fontSize: 11,
                      fontWeight: 500,
                    }}
                  >
                    {shelfCount}
                  </span>
                  <button
                    style={{
                      width: 22,
                      height: 22,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      border: "1px solid #ccc",
                      borderRadius: 4,
                      background: "#f5f5f5",
                      fontSize: 13,
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

              {/* RIGHT: Gornji modul */}
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: 4,
                  paddingLeft: 12,
                }}
              >
                <span
                  style={{
                    fontSize: 11,
                    fontWeight: 600,
                    color: "#a855f7",
                    marginBottom: 2,
                  }}
                >
                  Gornji modul
                </span>

                {/* Placeholder row for alignment (matches width row on left) */}
                {hasMultipleColumns && <div style={{ height: 22 }} />}

                {/* Top module height */}
                <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                  <span style={{ fontSize: 11, color: "#666", width: 42 }}>
                    Visina
                  </span>
                  <button
                    style={{
                      width: 22,
                      height: 22,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      border: "1px solid #ccc",
                      borderRadius: 4,
                      background: "#f5f5f5",
                      fontSize: 13,
                      cursor: canDecreaseTopHeight ? "pointer" : "not-allowed",
                      opacity: canDecreaseTopHeight ? 1 : 0.4,
                    }}
                    onClick={() =>
                      handleModuleHeightChange("top", topModuleHeightCm - 1)
                    }
                    disabled={!canDecreaseTopHeight}
                  >
                    -
                  </button>
                  <input
                    type="number"
                    value={topModuleHeightCm}
                    onChange={(e) =>
                      handleModuleHeightChange(
                        "top",
                        parseInt(e.target.value) || 0,
                      )
                    }
                    min={minModuleHeightCm}
                    max={Math.min(
                      maxModuleHeightCm,
                      currentHeightCm - minModuleHeightCm,
                    )}
                    style={{
                      width: 42,
                      height: 22,
                      textAlign: "center",
                      border: "1px solid #ccc",
                      borderRadius: 4,
                      fontSize: 11,
                      fontWeight: 500,
                      color: "#a855f7",
                      padding: "2px 4px",
                    }}
                  />
                  <button
                    style={{
                      width: 22,
                      height: 22,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      border: "1px solid #ccc",
                      borderRadius: 4,
                      background: "#f5f5f5",
                      fontSize: 13,
                      cursor: canIncreaseTopHeight ? "pointer" : "not-allowed",
                      opacity: canIncreaseTopHeight ? 1 : 0.4,
                    }}
                    onClick={() =>
                      handleModuleHeightChange("top", topModuleHeightCm + 1)
                    }
                    disabled={!canIncreaseTopHeight}
                  >
                    +
                  </button>
                </div>

                {/* Top module shelves */}
                <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                  <span style={{ fontSize: 11, color: "#666", width: 42 }}>
                    Police
                  </span>
                  <button
                    style={{
                      width: 22,
                      height: 22,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      border: "1px solid #ccc",
                      borderRadius: 4,
                      background: "#f5f5f5",
                      fontSize: 13,
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
                      width: 42,
                      textAlign: "center",
                      fontSize: 11,
                      fontWeight: 500,
                    }}
                  >
                    {topModuleShelfCount}
                  </span>
                  <button
                    style={{
                      width: 22,
                      height: 22,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      border: "1px solid #ccc",
                      borderRadius: 4,
                      background: "#f5f5f5",
                      fontSize: 13,
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
            </div>
          </div>
        ) : (
          // SINGLE MODULE LAYOUT (no split)
          <div
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

            {/* Shelf count control */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: 8,
              }}
            >
              <span style={{ fontSize: 12, color: "#000000", minWidth: 50 }}>
                Police
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
          </div>
        )}
      </div>
    </Html>
  );
}
