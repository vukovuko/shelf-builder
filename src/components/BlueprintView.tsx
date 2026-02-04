"use client";

import type React from "react";
import { useShelfStore, type Material, type ShelfState } from "@/lib/store";
import { DRAWER_HEIGHT_CM, DRAWER_GAP_CM } from "@/lib/wardrobe-constants";

// Helper to build column blocks from vertical boundaries
function buildBlocksFromBoundaries(
  widthCm: number,
  boundaries: number[] | undefined,
): { start: number; end: number; width: number }[] {
  const w = widthCm / 100; // Convert to meters for boundary comparison
  const result: { start: number; end: number; width: number }[] = [];

  if (!boundaries || boundaries.length === 0) {
    result.push({ start: 0, end: widthCm, width: widthCm });
  } else {
    const sortedBoundaries = [...boundaries].sort((a, b) => a - b);
    const boundaryCm = sortedBoundaries.map((b) => (b + w / 2) * 100);

    let prevX = 0;
    for (const bCm of boundaryCm) {
      if (bCm > prevX && bCm < widthCm) {
        result.push({ start: prevX, end: bCm, width: bCm - prevX });
        prevX = bCm;
      }
    }
    if (prevX < widthCm) {
      result.push({ start: prevX, end: widthCm, width: widthCm - prevX });
    }
  }

  return result;
}

export function BlueprintView() {
  const {
    width,
    height,
    depth,
    hasBase,
    baseHeight,
    selectedMaterialId,
    materials,
  } = useShelfStore();

  // Get store state
  const verticalBoundaries = useShelfStore(
    (s: ShelfState) => s.verticalBoundaries,
  );
  const columnHorizontalBoundaries = useShelfStore(
    (s: ShelfState) => s.columnHorizontalBoundaries,
  );
  const elementConfigs = useShelfStore((s: ShelfState) => s.elementConfigs);
  const compartmentExtras = useShelfStore(
    (s: ShelfState) => s.compartmentExtras,
  );
  // Module boundaries for tall wardrobes (>200cm)
  const columnModuleBoundaries = useShelfStore(
    (s: ShelfState) => s.columnModuleBoundaries,
  );
  const columnTopModuleShelves = useShelfStore(
    (s: ShelfState) => s.columnTopModuleShelves,
  );
  const columnHeights = useShelfStore((s: ShelfState) => s.columnHeights);

  // Material thickness (cm)
  const mat = materials.find((m: Material) => m.id === selectedMaterialId);
  const tCm = Number(mat?.thickness ?? 18) / 10; // thickness in cm
  const thicknessMm = Number(mat?.thickness ?? 18);

  // Drawing layout
  const padding = 60;
  const viewBoxWidth = 1000;
  const viewBoxHeight = 750;
  const headerHeight = 60; // Space for title
  const maxDrawingWidth = viewBoxWidth - padding * 2 - 100;
  const maxDrawingHeight = viewBoxHeight - padding * 2 - headerHeight - 80;

  // Calculate scale
  const scaleX = maxDrawingWidth / (width + depth + 80);
  const scaleY = maxDrawingHeight / height;
  const scale = Math.min(scaleX, scaleY, 2.5);
  const scaleRatio = Math.round(100 / scale); // For "Razmer 1:X"

  // Scaled dimensions
  const scaledWidth = width * scale;
  const scaledHeight = height * scale;
  const scaledDepth = depth * scale;
  const scaledBaseHeight = hasBase ? baseHeight * scale : 0;

  // Positioning
  const frontViewX = padding + 40;
  const frontViewY = padding + headerHeight + 20;
  const sideViewX = frontViewX + scaledWidth + 50;
  const sideViewY = frontViewY;

  // Build columns
  const columns = buildBlocksFromBoundaries(width, verticalBoundaries);

  // Map Y from cm (from floor) to SVG Y (top-origin)
  // CLAMP to stay within frame
  const mapY = (yFromFloorCm: number) => {
    const clamped = Math.max(0, Math.min(height, yFromFloorCm));
    return frontViewY + scaledHeight - clamped * scale;
  };

  // Map Y for a specific column (accounts for different column heights)
  // Columns with shorter heights are drawn with bottom aligned to wardrobe bottom
  const mapYForColumn = (yFromFloorCm: number, colIdx: number) => {
    const colH = columnHeights[colIdx] ?? height;
    const clamped = Math.max(0, Math.min(colH, yFromFloorCm));
    // All columns share the same bottom (floor level), so we use wardrobe height for Y calculation
    // but clamp to column height
    return frontViewY + scaledHeight - clamped * scale;
  };

  // Split threshold for module boundaries (200cm in meters)
  const splitThreshold = 2.0;

  // Get compartments for a column - handles BOTH regular shelves AND module boundaries
  // This matches the logic in CarcassFrame for correct compartment numbering
  const getCompartmentsForColumn = (colIdx: number) => {
    const colLetter = String.fromCharCode(65 + colIdx);
    const colHCm = columnHeights[colIdx] ?? height; // column height in cm
    const colH = colHCm / 100; // column height in meters

    // Get shelf positions for bottom module
    const shelves = columnHorizontalBoundaries[colIdx] || [];

    // Inner bounds (inside panels) in cm from floor
    // Use COLUMN height for innerTop, not wardrobe height!
    const innerBottom = hasBase ? baseHeight + tCm : tCm;
    const innerTop = colHCm - tCm; // Column-specific top

    // Check for module boundary (tall wardrobes >200cm)
    // VALIDATE: Module boundary must be INSIDE wardrobe (between innerBottom and innerTop)
    // NOTE: columnModuleBoundaries uses FLOOR-ORIGIN meters (Y=0 at floor), NOT center-origin
    const moduleBoundary = columnModuleBoundaries[colIdx] ?? null;
    const rawModuleBoundaryYCm =
      moduleBoundary !== null
        ? moduleBoundary * 100 // Already floor-origin, just convert m to cm
        : null;
    const isValidModuleBoundary =
      rawModuleBoundaryYCm !== null &&
      rawModuleBoundaryYCm > innerBottom + tCm && // Must be above bottom panel + minimum space
      rawModuleBoundaryYCm < innerTop - tCm; // Must be below top panel - minimum space

    const hasModuleBoundary =
      moduleBoundary !== null && colH > splitThreshold && isValidModuleBoundary;

    // Get top module shelves if module boundary exists AND is valid
    const topModuleShelves = hasModuleBoundary
      ? columnTopModuleShelves[colIdx] || []
      : [];

    // Module boundary Y in cm from floor (if exists AND valid)
    const moduleBoundaryYCm = hasModuleBoundary ? rawModuleBoundaryYCm : null;

    const compartments: {
      key: string;
      bottomY: number;
      topY: number;
      heightCm: number;
    }[] = [];

    let compNum = 1;

    // === BOTTOM MODULE COMPARTMENTS ===
    // Convert shelf positions to cm from floor
    // NOTE: columnHorizontalBoundaries uses FLOOR-ORIGIN meters (Y=0 at floor)
    const bottomShelfYsCm = shelves
      .map((s: number) => s * 100) // Already floor-origin, just convert m to cm
      .filter(
        (y: number) => y > innerBottom && y < (moduleBoundaryYCm ?? innerTop),
      )
      .sort((a: number, b: number) => a - b);

    // Bottom module top boundary
    const bottomModuleTop = hasModuleBoundary
      ? moduleBoundaryYCm! - tCm // below module boundary panel
      : innerTop;

    let prevY = innerBottom;

    for (const shelfY of bottomShelfYsCm) {
      if (shelfY > prevY + tCm) {
        compartments.push({
          key: `${colLetter}${compNum}`,
          bottomY: prevY,
          topY: shelfY - tCm / 2,
          heightCm: Math.round(shelfY - tCm / 2 - prevY),
        });
        compNum++;
        prevY = shelfY + tCm / 2;
      }
    }

    // Final compartment in bottom module
    if (prevY < bottomModuleTop) {
      compartments.push({
        key: `${colLetter}${compNum}`,
        bottomY: prevY,
        topY: bottomModuleTop,
        heightCm: Math.round(bottomModuleTop - prevY),
      });
      compNum++;
    }

    // === TOP MODULE COMPARTMENTS (if module boundary exists) ===
    if (hasModuleBoundary && moduleBoundaryYCm) {
      const topModuleBottom = moduleBoundaryYCm + tCm; // above module boundary panel

      // Convert top module shelf positions to cm
      // NOTE: columnTopModuleShelves uses FLOOR-ORIGIN meters (Y=0 at floor)
      const topShelfYsCm = topModuleShelves
        .map((s: number) => s * 100) // Already floor-origin, just convert m to cm
        .filter((y: number) => y > topModuleBottom && y < innerTop)
        .sort((a: number, b: number) => a - b);

      prevY = topModuleBottom;

      for (const shelfY of topShelfYsCm) {
        if (shelfY > prevY + tCm) {
          compartments.push({
            key: `${colLetter}${compNum}`,
            bottomY: prevY,
            topY: shelfY - tCm / 2,
            heightCm: Math.round(shelfY - tCm / 2 - prevY),
          });
          compNum++;
          prevY = shelfY + tCm / 2;
        }
      }

      // Final compartment to top
      if (prevY < innerTop) {
        compartments.push({
          key: `${colLetter}${compNum}`,
          bottomY: prevY,
          topY: innerTop,
          heightCm: Math.round(innerTop - prevY),
        });
      }
    }

    // If no compartments created, create one full-height compartment
    if (compartments.length === 0) {
      compartments.push({
        key: `${colLetter}1`,
        bottomY: innerBottom,
        topY: innerTop,
        heightCm: Math.round(innerTop - innerBottom),
      });
    }

    return compartments;
  };

  // Global space counter
  let globalSpaceNum = 1;

  return (
    <div className="w-full h-full bg-white flex items-center justify-center">
      <svg
        id="blueprint-technical-drawing"
        width="100%"
        height="100%"
        viewBox={`0 0 ${viewBoxWidth} ${viewBoxHeight}`}
        style={{ backgroundColor: "white" }}
      >
        <defs>
          <pattern
            id="diagonalHatch"
            patternUnits="userSpaceOnUse"
            width="6"
            height="6"
          >
            <path d="M 0,6 L 6,0" stroke="#555" strokeWidth="0.5" />
          </pattern>
          <pattern
            id="crossHatch"
            patternUnits="userSpaceOnUse"
            width="6"
            height="6"
          >
            <path d="M 0,6 L 6,0 M 0,0 L 6,6" stroke="#888" strokeWidth="0.5" />
          </pattern>
          <pattern
            id="drawerHatch"
            patternUnits="userSpaceOnUse"
            width="4"
            height="4"
          >
            <path d="M 0,4 L 4,0" stroke="#a0522d" strokeWidth="0.5" />
          </pattern>
        </defs>

        {/* ============================================ */}
        {/* HEADER - Title and metadata */}
        {/* ============================================ */}
        <g>
          <text
            x={viewBoxWidth / 2}
            y={30}
            fontSize="18"
            fontFamily="Arial, sans-serif"
            fontWeight="bold"
            textAnchor="middle"
          >
            Tehnički crtež - Orman
          </text>
          <text x={padding} y={55} fontSize="10" fontFamily="Arial, sans-serif">
            Dimenzije: {width} × {height} × {depth} cm
          </text>
          <text
            x={padding + 200}
            y={55}
            fontSize="10"
            fontFamily="Arial, sans-serif"
          >
            Debljina ploče: {thicknessMm} mm
          </text>
          <text
            x={padding + 380}
            y={55}
            fontSize="10"
            fontFamily="Arial, sans-serif"
          >
            Mere u cm
          </text>
          <text
            x={viewBoxWidth - padding}
            y={55}
            fontSize="10"
            fontFamily="Arial, sans-serif"
            textAnchor="end"
          >
            Razmer 1:{scaleRatio}
          </text>
        </g>

        {/* ============================================ */}
        {/* FRONT VIEW */}
        {/* ============================================ */}
        <g>
          {/* Label */}
          <text
            x={frontViewX + scaledWidth / 2}
            y={frontViewY - 10}
            fontSize="11"
            fontFamily="Arial, sans-serif"
            textAnchor="middle"
            fontStyle="italic"
          >
            Pogled spreda
          </text>

          {/* Per-column frames with individual heights */}
          {columns.map((col, colIdx) => {
            const colH = columnHeights[colIdx] ?? height;
            const scaledColH = colH * scale;
            const colX = frontViewX + col.start * scale;
            const colW = col.width * scale;
            // Y offset: shorter columns start lower (bottom-aligned)
            const yOffset = scaledHeight - scaledColH;

            return (
              <rect
                key={`col-frame-${colIdx}`}
                x={colX}
                y={frontViewY + yOffset}
                width={colW}
                height={scaledColH}
                fill="none"
                stroke="#000"
                strokeWidth="2"
              />
            );
          })}

          {/* Base with cross-hatch - per column */}
          {hasBase &&
            scaledBaseHeight > 0 &&
            columns.map((col, colIdx) => {
              const colX = frontViewX + col.start * scale;
              const colW = col.width * scale;

              return (
                <rect
                  key={`base-${colIdx}`}
                  x={colX}
                  y={frontViewY + scaledHeight - scaledBaseHeight}
                  width={colW}
                  height={scaledBaseHeight}
                  fill="url(#crossHatch)"
                  stroke="#000"
                  strokeWidth="1"
                />
              );
            })}

          {/* Vertical seams between columns (SOLID lines) */}
          {/* Seams extend to the MINIMUM height of adjacent columns */}
          {columns.slice(0, -1).map((col, i) => {
            const leftColH = columnHeights[i] ?? height;
            const rightColH = columnHeights[i + 1] ?? height;
            const seamH = Math.min(leftColH, rightColH); // Use minimum of adjacent columns
            const scaledSeamH = seamH * scale;
            const yOffset = scaledHeight - scaledSeamH; // Bottom-aligned offset

            const dividerX = frontViewX + col.end * scale;
            return (
              <line
                key={`vdiv-${i}`}
                x1={dividerX}
                y1={frontViewY + yOffset}
                x2={dividerX}
                y2={frontViewY + scaledHeight - scaledBaseHeight}
                stroke="#000"
                strokeWidth="1.5"
              />
            );
          })}

          {/* Per-column content */}
          {columns.map((col, colIdx) => {
            const x1 = frontViewX + col.start * scale;
            const x2 = frontViewX + col.end * scale;
            const colCenterX = (x1 + x2) / 2;

            const compartments = getCompartmentsForColumn(colIdx);
            const nodes: React.ReactNode[] = [];

            // Draw main horizontal shelves (bottom module)
            // NOTE: columnHorizontalBoundaries uses FLOOR-ORIGIN meters (Y=0 at floor)
            const colHForShelves = columnHeights[colIdx] ?? height;
            const shelves = columnHorizontalBoundaries[colIdx] || [];
            const shelfYsCm = shelves.map((s: number) => s * 100); // Already floor-origin
            shelfYsCm.forEach((shelfY: number, shIdx: number) => {
              // Only draw shelves within this column's height
              if (shelfY > 0 && shelfY < colHForShelves) {
                nodes.push(
                  <line
                    key={`shelf-${colIdx}-${shIdx}`}
                    x1={x1}
                    y1={mapYForColumn(shelfY, colIdx)}
                    x2={x2}
                    y2={mapYForColumn(shelfY, colIdx)}
                    stroke="#000"
                    strokeWidth="1"
                  />,
                );
              }
            });

            // Draw module boundary line (if exists AND valid) - thicker line for module split
            // NOTE: columnModuleBoundaries uses FLOOR-ORIGIN meters (Y=0 at floor)
            const colHMeters = (columnHeights[colIdx] ?? height) / 100;
            const colHCmForBoundary = columnHeights[colIdx] ?? height;
            const moduleBoundary = columnModuleBoundaries[colIdx] ?? null;
            const innerBottomForBoundary = hasBase ? baseHeight + tCm : tCm;
            const innerTopForBoundary = colHCmForBoundary - tCm; // Use column-specific height

            if (moduleBoundary !== null && colHMeters > splitThreshold) {
              const moduleBoundaryYCm = moduleBoundary * 100; // Already floor-origin
              // VALIDATE: boundary must be within inner bounds (with margin for panels)
              const isValidBoundary =
                moduleBoundaryYCm > innerBottomForBoundary + tCm &&
                moduleBoundaryYCm < innerTopForBoundary - tCm;

              if (isValidBoundary) {
                nodes.push(
                  <line
                    key={`module-boundary-${colIdx}`}
                    x1={x1}
                    y1={mapYForColumn(moduleBoundaryYCm, colIdx)}
                    x2={x2}
                    y2={mapYForColumn(moduleBoundaryYCm, colIdx)}
                    stroke="#000"
                    strokeWidth="1.5"
                  />,
                );
              }
            }

            // Draw top module shelves (only if module boundary is valid)
            // NOTE: columnTopModuleShelves uses FLOOR-ORIGIN meters (Y=0 at floor)
            const topModuleShelves = columnTopModuleShelves[colIdx] || [];
            if (
              topModuleShelves.length > 0 &&
              moduleBoundary !== null &&
              colHMeters > splitThreshold
            ) {
              const moduleBoundaryYCmForTopShelves = moduleBoundary * 100; // Already floor-origin
              const isModuleBoundaryValid =
                moduleBoundaryYCmForTopShelves > innerBottomForBoundary + tCm &&
                moduleBoundaryYCmForTopShelves < innerTopForBoundary - tCm;

              if (isModuleBoundaryValid) {
                const topShelfYsCm = topModuleShelves.map(
                  (s: number) => s * 100,
                ); // Already floor-origin
                topShelfYsCm.forEach((shelfY: number, shIdx: number) => {
                  // Top module shelves must be above the module boundary and below top
                  if (
                    shelfY > moduleBoundaryYCmForTopShelves + tCm &&
                    shelfY < innerTopForBoundary
                  ) {
                    nodes.push(
                      <line
                        key={`top-shelf-${colIdx}-${shIdx}`}
                        x1={x1}
                        y1={mapYForColumn(shelfY, colIdx)}
                        x2={x2}
                        y2={mapYForColumn(shelfY, colIdx)}
                        stroke="#000"
                        strokeWidth="1"
                      />,
                    );
                  }
                });
              }
            }

            // Draw compartment contents
            const colHForCompartments = columnHeights[colIdx] ?? height;
            compartments.forEach((comp) => {
              const compKey = comp.key;
              const cfg = elementConfigs[compKey] ?? {
                columns: 1,
                rowCounts: [0],
              };
              const extras = compartmentExtras[compKey] ?? {};
              const innerCols = Math.max(1, cfg.columns);

              const compX1 = x1;
              const compX2 = x2;
              const compW = compX2 - compX1;
              const sectionW = compW / innerCols;

              // Clamp compartment bounds to be within column frame
              const safeBottomY = Math.max(
                0,
                Math.min(colHForCompartments, comp.bottomY),
              );
              const safeTopY = Math.max(
                0,
                Math.min(colHForCompartments, comp.topY),
              );

              if (safeTopY <= safeBottomY) return; // Skip invalid compartments

              // Draw inner vertical dividers (DASHED lines)
              if (innerCols > 1) {
                for (let divIdx = 1; divIdx < innerCols; divIdx++) {
                  const divX = compX1 + divIdx * sectionW;
                  nodes.push(
                    <line
                      key={`vd-${compKey}-${divIdx}`}
                      x1={divX}
                      y1={mapYForColumn(safeTopY, colIdx)}
                      x2={divX}
                      y2={mapYForColumn(safeBottomY, colIdx)}
                      stroke="#666"
                      strokeWidth="0.75"
                      strokeDasharray="3,2"
                    />,
                  );
                }
              }

              // Draw inner shelves per section
              for (let secIdx = 0; secIdx < innerCols; secIdx++) {
                const shelfCount = cfg.rowCounts?.[secIdx] ?? 0;
                if (shelfCount <= 0) {
                  continue;
                }

                const secX1 = compX1 + secIdx * sectionW + 2;
                const secX2 = compX1 + (secIdx + 1) * sectionW - 2;
                const usableH = safeTopY - safeBottomY;
                const gap = usableH / (shelfCount + 1);

                for (let shIdx = 1; shIdx <= shelfCount; shIdx++) {
                  const shelfY = safeBottomY + shIdx * gap;
                  nodes.push(
                    <line
                      key={`ish-${compKey}-${secIdx}-${shIdx}`}
                      x1={secX1}
                      y1={mapYForColumn(shelfY, colIdx)}
                      x2={secX2}
                      y2={mapYForColumn(shelfY, colIdx)}
                      stroke="#666"
                      strokeWidth="0.75"
                    />,
                  );
                }

                // Draw height labels for spaces between inner shelves
                // Always show labels regardless of height (user requirement)
                // MIN_DRAG_GAP = 10cm is the minimum compartment height
                if (gap > 0) {
                  for (let spaceIdx = 0; spaceIdx <= shelfCount; spaceIdx++) {
                    const spaceBottomY = safeBottomY + spaceIdx * gap;
                    const spaceTopY = safeBottomY + (spaceIdx + 1) * gap;
                    const spaceMidY = (spaceBottomY + spaceTopY) / 2;
                    const spaceMidX = (secX1 + secX2) / 2;
                    const spaceHeightCm = Math.round(gap);
                    // Font size (min gap is 10cm per MIN_DRAG_GAP)
                    const labelFontSize = gap < 15 ? 7 : 8;

                    nodes.push(
                      <text
                        key={`ish-h-${compKey}-${secIdx}-${spaceIdx}`}
                        x={spaceMidX}
                        y={mapYForColumn(spaceMidY, colIdx)}
                        textAnchor="middle"
                        dominantBaseline="middle"
                        fontSize={labelFontSize}
                        fill="#666"
                      >
                        {spaceHeightCm}
                      </text>,
                    );
                  }
                }
              }

              // Draw drawers
              if (
                extras.drawers &&
                extras.drawersCount &&
                extras.drawersCount > 0
              ) {
                const drawerH = DRAWER_HEIGHT_CM;
                const drawerGap = DRAWER_GAP_CM;
                const numDrawers = Math.min(extras.drawersCount, 10);

                for (let drIdx = 0; drIdx < numDrawers; drIdx++) {
                  const drawerBottomY =
                    safeBottomY + drIdx * (drawerH + drawerGap) + 1;
                  const drawerTopY = drawerBottomY + drawerH;

                  if (drawerTopY <= safeTopY) {
                    nodes.push(
                      <rect
                        key={`drawer-${compKey}-${drIdx}`}
                        x={compX1 + 4}
                        y={mapYForColumn(drawerTopY, colIdx)}
                        width={compW - 8}
                        height={(drawerTopY - drawerBottomY) * scale}
                        fill="url(#drawerHatch)"
                        stroke="#8b4513"
                        strokeWidth="0.5"
                      />,
                    );
                  }
                }
              }

              // Draw rod
              if (extras.rod) {
                const rodY = safeBottomY + (safeTopY - safeBottomY) * 0.8;
                nodes.push(
                  <g key={`rod-${compKey}`}>
                    <line
                      x1={compX1 + 8}
                      y1={mapYForColumn(rodY, colIdx)}
                      x2={compX2 - 8}
                      y2={mapYForColumn(rodY, colIdx)}
                      stroke="#444"
                      strokeWidth="2.5"
                      strokeLinecap="round"
                    />
                    <circle
                      cx={compX1 + 8}
                      cy={mapYForColumn(rodY, colIdx)}
                      r="2.5"
                      fill="#666"
                    />
                    <circle
                      cx={compX2 - 8}
                      cy={mapYForColumn(rodY, colIdx)}
                      r="2.5"
                      fill="#666"
                    />
                  </g>,
                );
              }

              // Numbered label in corner
              const spaceNum = globalSpaceNum++;
              const labelX = compX1 + 4;
              const labelY = mapYForColumn(safeTopY, colIdx) + 4;
              nodes.push(
                <g key={`label-${compKey}`}>
                  <rect
                    x={labelX}
                    y={labelY}
                    width={16}
                    height={12}
                    fill="white"
                    stroke="#000"
                    strokeWidth="0.5"
                  />
                  <text
                    x={labelX + 8}
                    y={labelY + 9}
                    fontSize="8"
                    fontFamily="Arial, sans-serif"
                    textAnchor="middle"
                  >
                    {spaceNum}
                  </text>
                </g>,
              );

              // Height label centered - always show regardless of height (user requirement)
              // MIN_DRAG_GAP = 10cm is the minimum compartment height
              if (comp.heightCm > 0) {
                // Font size (min height is 10cm per MIN_DRAG_GAP)
                const heightLabelFontSize = comp.heightCm < 15 ? 9 : 11;
                nodes.push(
                  <text
                    key={`h-${compKey}`}
                    x={colCenterX}
                    y={mapYForColumn((safeBottomY + safeTopY) / 2, colIdx)}
                    fontSize={heightLabelFontSize}
                    fontFamily="Arial, sans-serif"
                    textAnchor="middle"
                    dominantBaseline="middle"
                  >
                    {comp.heightCm}
                  </text>,
                );
              }
            });

            return <g key={`col-${colIdx}`}>{nodes}</g>;
          })}

          {/* ============================================ */}
          {/* EXTERNAL DIMENSIONS */}
          {/* ============================================ */}

          {/* Overall max height on left side - ALWAYS shown */}
          {(() => {
            // Calculate max column height
            const maxColHeight = Math.max(
              ...columns.map((_, i) => columnHeights[i] ?? height),
            );
            const scaledMaxHeight = maxColHeight * scale;
            const maxYOffset = scaledHeight - scaledMaxHeight;

            // Check if columns have varying heights
            const hasVaryingHeights = columns.some(
              (_, i) => (columnHeights[i] ?? height) !== maxColHeight,
            );

            return (
              <>
                {/* ALWAYS show overall max height on left */}
                <g>
                  <line
                    x1={frontViewX - 25}
                    y1={frontViewY + maxYOffset}
                    x2={frontViewX - 25}
                    y2={frontViewY + scaledHeight}
                    stroke="#000"
                    strokeWidth="0.75"
                  />
                  <line
                    x1={frontViewX - 30}
                    y1={frontViewY + maxYOffset}
                    x2={frontViewX - 20}
                    y2={frontViewY + maxYOffset}
                    stroke="#000"
                    strokeWidth="0.75"
                  />
                  <line
                    x1={frontViewX - 30}
                    y1={frontViewY + scaledHeight}
                    x2={frontViewX - 20}
                    y2={frontViewY + scaledHeight}
                    stroke="#000"
                    strokeWidth="0.75"
                  />
                  <text
                    x={frontViewX - 35}
                    y={frontViewY + maxYOffset + scaledMaxHeight / 2}
                    fontSize="11"
                    fontFamily="Arial, sans-serif"
                    textAnchor="middle"
                    transform={`rotate(-90 ${frontViewX - 35} ${frontViewY + maxYOffset + scaledMaxHeight / 2})`}
                  >
                    {Math.round(maxColHeight)} cm
                  </text>
                </g>

                {/* ADDITIONALLY show per-column heights above columns if they vary */}
                {hasVaryingHeights &&
                  columns.map((col, i) => {
                    const colH = columnHeights[i] ?? height;
                    const scaledColH = colH * scale;
                    const yOffset = scaledHeight - scaledColH;
                    const colX1 = frontViewX + col.start * scale;
                    const colX2 = frontViewX + col.end * scale;
                    const centerX = (colX1 + colX2) / 2;

                    return (
                      <g key={`colheight-${i}`}>
                        {/* Height label above each column */}
                        <text
                          x={centerX}
                          y={frontViewY + yOffset - 5}
                          fontSize="9"
                          fontFamily="Arial, sans-serif"
                          textAnchor="middle"
                        >
                          {Math.round(colH)}
                        </text>
                      </g>
                    );
                  })}
              </>
            );
          })()}

          {/* Base height */}
          {hasBase && baseHeight > 0 && (
            <g>
              <line
                x1={frontViewX - 12}
                y1={mapY(baseHeight)}
                x2={frontViewX - 12}
                y2={frontViewY + scaledHeight}
                stroke="#000"
                strokeWidth="0.5"
              />
              <text
                x={frontViewX - 8}
                y={mapY(baseHeight / 2)}
                fontSize="9"
                fontFamily="Arial, sans-serif"
                textAnchor="start"
                dominantBaseline="middle"
              >
                {baseHeight}
              </text>
            </g>
          )}

          {/* Column widths at bottom */}
          {columns.map((col, i) => {
            const colX1 = frontViewX + col.start * scale;
            const colX2 = frontViewX + col.end * scale;
            const centerX = (colX1 + colX2) / 2;
            const y = frontViewY + scaledHeight + 18;

            return (
              <g key={`colwidth-${i}`}>
                <line
                  x1={colX1}
                  y1={frontViewY + scaledHeight + 5}
                  x2={colX1}
                  y2={frontViewY + scaledHeight + 12}
                  stroke="#000"
                  strokeWidth="0.5"
                />
                <line
                  x1={colX2}
                  y1={frontViewY + scaledHeight + 5}
                  x2={colX2}
                  y2={frontViewY + scaledHeight + 12}
                  stroke="#000"
                  strokeWidth="0.5"
                />
                <line
                  x1={colX1}
                  y1={y - 10}
                  x2={colX2}
                  y2={y - 10}
                  stroke="#000"
                  strokeWidth="0.5"
                />
                <text
                  x={centerX}
                  y={y}
                  fontSize="10"
                  fontFamily="Arial, sans-serif"
                  textAnchor="middle"
                >
                  {Math.round(col.width)}
                </text>
              </g>
            );
          })}

          {/* Overall width */}
          <g>
            <line
              x1={frontViewX}
              y1={frontViewY + scaledHeight + 32}
              x2={frontViewX + scaledWidth}
              y2={frontViewY + scaledHeight + 32}
              stroke="#000"
              strokeWidth="0.75"
            />
            <line
              x1={frontViewX}
              y1={frontViewY + scaledHeight + 27}
              x2={frontViewX}
              y2={frontViewY + scaledHeight + 37}
              stroke="#000"
              strokeWidth="0.75"
            />
            <line
              x1={frontViewX + scaledWidth}
              y1={frontViewY + scaledHeight + 27}
              x2={frontViewX + scaledWidth}
              y2={frontViewY + scaledHeight + 37}
              stroke="#000"
              strokeWidth="0.75"
            />
            <text
              x={frontViewX + scaledWidth / 2}
              y={frontViewY + scaledHeight + 48}
              fontSize="12"
              fontFamily="Arial, sans-serif"
              textAnchor="middle"
            >
              {width} cm
            </text>
          </g>
        </g>

        {/* ============================================ */}
        {/* SIDE VIEW */}
        {/* ============================================ */}
        {(() => {
          // Use max column height for side view
          const maxColHeight = Math.max(
            ...columns.map((_, i) => columnHeights[i] ?? height),
          );
          const scaledMaxHeight = maxColHeight * scale;
          const sideYOffset = scaledHeight - scaledMaxHeight; // Align bottom

          return (
            <g>
              {/* Label */}
              <text
                x={sideViewX + scaledDepth / 2}
                y={sideViewY - 10}
                fontSize="11"
                fontFamily="Arial, sans-serif"
                textAnchor="middle"
                fontStyle="italic"
              >
                Pogled sa strane
              </text>

              {/* Main rectangle with hatching - uses max column height */}
              <rect
                x={sideViewX}
                y={sideViewY + sideYOffset}
                width={scaledDepth}
                height={scaledMaxHeight}
                fill="url(#diagonalHatch)"
                stroke="#000"
                strokeWidth="2"
              />

              {/* Base */}
              {hasBase && scaledBaseHeight > 0 && (
                <rect
                  x={sideViewX}
                  y={sideViewY + scaledHeight - scaledBaseHeight}
                  width={scaledDepth}
                  height={scaledBaseHeight}
                  fill="url(#crossHatch)"
                  stroke="#000"
                  strokeWidth="1"
                />
              )}

              {/* Height dimension - uses max column height */}
              <g>
                <line
                  x1={sideViewX + scaledDepth + 18}
                  y1={sideViewY + sideYOffset}
                  x2={sideViewX + scaledDepth + 18}
                  y2={sideViewY + scaledHeight}
                  stroke="#000"
                  strokeWidth="0.75"
                />
                <line
                  x1={sideViewX + scaledDepth + 13}
                  y1={sideViewY + sideYOffset}
                  x2={sideViewX + scaledDepth + 23}
                  y2={sideViewY + sideYOffset}
                  stroke="#000"
                  strokeWidth="0.75"
                />
                <line
                  x1={sideViewX + scaledDepth + 13}
                  y1={sideViewY + scaledHeight}
                  x2={sideViewX + scaledDepth + 23}
                  y2={sideViewY + scaledHeight}
                  stroke="#000"
                  strokeWidth="0.75"
                />
                <text
                  x={sideViewX + scaledDepth + 28}
                  y={sideViewY + sideYOffset + scaledMaxHeight / 2}
                  fontSize="11"
                  fontFamily="Arial, sans-serif"
                  textAnchor="middle"
                  transform={`rotate(-90 ${sideViewX + scaledDepth + 28} ${sideViewY + sideYOffset + scaledMaxHeight / 2})`}
                >
                  {Math.round(maxColHeight)} cm
                </text>
              </g>

              {/* Depth dimension */}
              <g>
                <line
                  x1={sideViewX}
                  y1={sideViewY + scaledHeight + 18}
                  x2={sideViewX + scaledDepth}
                  y2={sideViewY + scaledHeight + 18}
                  stroke="#000"
                  strokeWidth="0.75"
                />
                <line
                  x1={sideViewX}
                  y1={sideViewY + scaledHeight + 13}
                  x2={sideViewX}
                  y2={sideViewY + scaledHeight + 23}
                  stroke="#000"
                  strokeWidth="0.75"
                />
                <line
                  x1={sideViewX + scaledDepth}
                  y1={sideViewY + scaledHeight + 13}
                  x2={sideViewX + scaledDepth}
                  y2={sideViewY + scaledHeight + 23}
                  stroke="#000"
                  strokeWidth="0.75"
                />
                <text
                  x={sideViewX + scaledDepth / 2}
                  y={sideViewY + scaledHeight + 34}
                  fontSize="11"
                  fontFamily="Arial, sans-serif"
                  textAnchor="middle"
                >
                  {depth} cm
                </text>
              </g>
            </g>
          );
        })()}
      </svg>
    </div>
  );
}
