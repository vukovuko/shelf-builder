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

  // Position below wardrobe (Y = -0.12 = 12cm below floor, moved down a bit more)
  const barY = -0.15;

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
          background: "rgba(255, 255, 255, 0.95)",
          borderRadius: 8,
          boxShadow: "0 2px 8px rgba(0,0,0,0.15)",
          padding: "4px 0 8px 0",
          minWidth: 280,
          color: "#000",
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
              borderBottom: "10px solid rgba(255, 255, 255, 0.95)",
            }}
          />
          <span
            style={{
              fontSize: 11,
              fontWeight: "bold",
              color: "#000",
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
            gap: 16,
            padding: "4px 12px",
          }}
        >
          {/* Height control */}
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <span style={{ fontSize: 13, color: "#000" }}>Visina</span>
            <button
              style={{
                width: 24,
                height: 24,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                border: "1px solid #000",
                borderRadius: 4,
                background: "#fff",
                color: "#000",
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
                fontSize: 13,
                fontWeight: 500,
                color: "#000",
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
                border: "1px solid #000",
                borderRadius: 4,
                background: "#fff",
                color: "#000",
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
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <span style={{ fontSize: 13, color: "#000" }}>Police</span>
            <button
              style={{
                width: 24,
                height: 24,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                border: "1px solid #000",
                borderRadius: 4,
                background: "#fff",
                color: "#000",
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
                minWidth: 24,
                textAlign: "center",
                fontSize: 13,
                fontWeight: 500,
                color: "#000",
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
                border: "1px solid #000",
                borderRadius: 4,
                background: "#fff",
                color: "#000",
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
