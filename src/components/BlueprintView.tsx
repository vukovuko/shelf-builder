"use client";

import type React from "react";
import {
  getDrawerFrontSpan,
  isDrawerCountValid,
  getDrawerStackMetrics,
  getVisibleShelfStartIndex,
  shouldUseDrawerStack,
} from "@/lib/drawer-layout";
import { useShelfStore, type Material, type ShelfState } from "@/lib/store";
import { TARGET_BOTTOM_HEIGHT_CM } from "@/lib/wardrobe-constants";
import {
  buildBlocksFromBoundaries,
  getCompartmentsForColumn as getCompartments,
  createMapY,
  createMapYForColumn,
} from "@/lib/blueprintHelpers";
import {
  buildCabinetShellRects,
  buildCabinetShellJointLines,
  buildDoubleSeamJointLines,
  buildDoubleSeamCenterLine,
  buildEvenShelfRects,
  buildSectionDividerRects,
  buildVerticalPanelSpans,
  computeSectionBounds,
} from "@/lib/technicalDrawingModel";
import { BlueprintHeader } from "./BlueprintHeader";
import { BlueprintSideView } from "./BlueprintSideView";

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
  const panelStroke = "#111";
  const panelFill = "#f5f5f5";
  const seamPanelFill = "#e9e9e9";
  const innerPanelFill = "#fafafa";
  const panelStrokeWidth = 0.9;

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
  const panelThicknessPx = tCm * scale;
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
  const mapY = createMapY(frontViewY, scaledHeight, scale, height);

  // Map Y for a specific column (accounts for different column heights)
  const mapYForColumn = createMapYForColumn(
    frontViewY,
    scaledHeight,
    scale,
    height,
    columnHeights,
  );

  // Split threshold for module boundaries (200cm in meters)
  const splitThreshold = 2.0;

  // Get compartments for a column - delegates to extracted pure function
  const getCompartmentsForColumn = (colIdx: number) =>
    getCompartments({
      colIdx,
      columnHeights,
      height,
      columnHorizontalBoundaries,
      columnModuleBoundaries,
      columnTopModuleShelves,
      hasBase,
      baseHeight,
      tCm,
    });

  // Global space counter
  let globalSpaceNum = 1;

  const createPanelRect = (
    key: string,
    x: number,
    y: number,
    widthPx: number,
    heightPx: number,
    fill = panelFill,
  ) => {
    if (widthPx <= 0 || heightPx <= 0) {
      return null;
    }

    return (
      <rect
        key={key}
        x={x}
        y={y}
        width={widthPx}
        height={heightPx}
        fill={fill}
        stroke={panelStroke}
        strokeWidth={panelStrokeWidth}
      />
    );
  };

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
        <BlueprintHeader
          viewBoxWidth={viewBoxWidth}
          padding={padding}
          width={width}
          height={height}
          depth={depth}
          thicknessMm={thicknessMm}
          scaleRatio={scaleRatio}
        />

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

          {/* Per-column carcass panels with actual panel thickness */}
          {columns.map((col, colIdx) => {
            const colH = columnHeights[colIdx] ?? height;
            const scaledColH = colH * scale;
            const colX = frontViewX + col.start * scale;
            const colW = col.width * scale;
            const yOffset = scaledHeight - scaledColH;
            const colTopY = frontViewY + yOffset;
            const moduleBoundary = columnModuleBoundaries[colIdx] ?? null;
            const moduleBoundaryCm =
              moduleBoundary !== null ? moduleBoundary * 100 : null;
            const sideSpans = buildVerticalPanelSpans({
              totalHeight: colH,
              splitAt:
                moduleBoundaryCm !== null && colH > TARGET_BOTTOM_HEIGHT_CM
                  ? moduleBoundaryCm
                  : null,
            });
            const renderSplitLeft = colIdx === 0 && sideSpans.length > 1;
            const renderSplitRight =
              colIdx === columns.length - 1 && sideSpans.length > 1;
            const shellPanels = buildCabinetShellRects({
              x: colX,
              y: colTopY,
              width: colW,
              height: scaledColH,
              panelThicknessX: panelThicknessPx,
              panelThicknessY: panelThicknessPx,
              baseHeight: scaledBaseHeight,
              includeLeft: colIdx === 0 && !renderSplitLeft,
              includeRight: colIdx === columns.length - 1 && !renderSplitRight,
            });
            const nodes: React.ReactNode[] = shellPanels
              .map((panel, panelIdx) =>
                createPanelRect(
                  `col-shell-${colIdx}-${panelIdx}`,
                  panel.x,
                  panel.y,
                  panel.width,
                  panel.height,
                  panel.tone === "outer" ? panelFill : innerPanelFill,
                ),
              )
              .filter(Boolean);

            if (renderSplitLeft) {
              sideSpans.forEach((span, spanIdx) => {
                const panel = createPanelRect(
                  `col-shell-left-${colIdx}-${spanIdx}`,
                  colX,
                  frontViewY +
                    scaledHeight -
                    (span.start + span.height) * scale,
                  panelThicknessPx,
                  span.height * scale,
                  panelFill,
                );
                if (panel) nodes.push(panel);
              });
            }

            if (renderSplitRight) {
              sideSpans.forEach((span, spanIdx) => {
                const panel = createPanelRect(
                  `col-shell-right-${colIdx}-${spanIdx}`,
                  colX + colW - panelThicknessPx,
                  frontViewY +
                    scaledHeight -
                    (span.start + span.height) * scale,
                  panelThicknessPx,
                  span.height * scale,
                  panelFill,
                );
                if (panel) nodes.push(panel);
              });
            }

            const shellJointLines = buildCabinetShellJointLines({
              x: colX,
              y: colTopY,
              width: colW,
              height: scaledColH,
              panelThicknessX: panelThicknessPx,
              panelThicknessY: panelThicknessPx,
              baseHeight: scaledBaseHeight,
              includeLeft: colIdx === 0 && !renderSplitLeft,
              includeRight: colIdx === columns.length - 1 && !renderSplitRight,
            });

            shellJointLines.forEach((line, lineIdx) => {
              nodes.push(
                <line
                  key={`col-joint-${colIdx}-${lineIdx}`}
                  x1={line.x1}
                  y1={line.y1}
                  x2={line.x2}
                  y2={line.y2}
                  stroke="#000"
                  strokeWidth="1"
                />,
              );
            });

            if (renderSplitLeft) {
              sideSpans.slice(0, -1).forEach((span, lineIdx) => {
                const jointY =
                  frontViewY +
                  scaledHeight -
                  (span.start + span.height) * scale;
                nodes.push(
                  <line
                    key={`col-left-joint-${colIdx}-${lineIdx}`}
                    x1={colX}
                    y1={jointY}
                    x2={colX + panelThicknessPx}
                    y2={jointY}
                    stroke="#000"
                    strokeWidth="1"
                  />,
                );
              });
            }

            if (renderSplitRight) {
              sideSpans.slice(0, -1).forEach((span, lineIdx) => {
                const jointY =
                  frontViewY +
                  scaledHeight -
                  (span.start + span.height) * scale;
                nodes.push(
                  <line
                    key={`col-right-joint-${colIdx}-${lineIdx}`}
                    x1={colX + colW - panelThicknessPx}
                    y1={jointY}
                    x2={colX + colW}
                    y2={jointY}
                    stroke="#000"
                    strokeWidth="1"
                  />,
                );
              });
            }

            return <g key={`col-frame-${colIdx}`}>{nodes}</g>;
          })}

          {/* Vertical seams between columns rendered as two touching panels */}
          {columns.slice(0, -1).map((col, i) => {
            const leftColH = columnHeights[i] ?? height;
            const rightColH = columnHeights[i + 1] ?? height;
            const seamH = Math.min(leftColH, rightColH);
            const seamX = frontViewX + col.end * scale;
            const leftBoundary = columnModuleBoundaries[i] ?? null;
            const rightBoundary = columnModuleBoundaries[i + 1] ?? null;
            const leftBoundaryCm =
              leftBoundary !== null ? leftBoundary * 100 : null;
            const rightBoundaryCm =
              rightBoundary !== null ? rightBoundary * 100 : null;
            const leftSpans = buildVerticalPanelSpans({
              totalHeight: leftColH,
              splitAt:
                leftBoundaryCm !== null && leftColH > TARGET_BOTTOM_HEIGHT_CM
                  ? leftBoundaryCm
                  : null,
            });
            const rightSpans = buildVerticalPanelSpans({
              totalHeight: rightColH,
              splitAt:
                rightBoundaryCm !== null && rightColH > TARGET_BOTTOM_HEIGHT_CM
                  ? rightBoundaryCm
                  : null,
            });
            const seamTopY = frontViewY + scaledHeight - seamH * scale;

            return (
              <g key={`vdiv-${i}`}>
                {leftSpans.map((span, panelIdx) =>
                  createPanelRect(
                    `vdiv-left-${i}-${panelIdx}`,
                    seamX - panelThicknessPx,
                    frontViewY +
                      scaledHeight -
                      (span.start + span.height) * scale,
                    panelThicknessPx,
                    span.height * scale,
                    seamPanelFill,
                  ),
                )}
                {rightSpans.map((span, panelIdx) =>
                  createPanelRect(
                    `vdiv-right-${i}-${panelIdx}`,
                    seamX,
                    frontViewY +
                      scaledHeight -
                      (span.start + span.height) * scale,
                    panelThicknessPx,
                    span.height * scale,
                    seamPanelFill,
                  ),
                )}
                {(() => {
                  const seamJointLines = buildDoubleSeamJointLines({
                    x: seamX,
                    y: seamTopY,
                    height: seamH * scale,
                    thickness: panelThicknessPx,
                    panelThicknessY: panelThicknessPx,
                    baseHeight: scaledBaseHeight,
                  });
                  return seamJointLines.map((line, lineIdx) => (
                    <line
                      key={`vdiv-shell-joint-${i}-${lineIdx}`}
                      x1={line.x1}
                      y1={line.y1}
                      x2={line.x2}
                      y2={line.y2}
                      stroke="#000"
                      strokeWidth="1"
                    />
                  ));
                })()}
                {(() => {
                  const seamCenterLine = buildDoubleSeamCenterLine({
                    x: seamX,
                    y: seamTopY,
                    height: seamH * scale,
                  });
                  if (!seamCenterLine) return null;
                  return (
                    <line
                      x1={seamCenterLine.x1}
                      y1={seamCenterLine.y1}
                      x2={seamCenterLine.x2}
                      y2={seamCenterLine.y2}
                      stroke="#000"
                      strokeWidth="0.8"
                    />
                  );
                })()}
                {leftSpans.slice(0, -1).map((span, lineIdx) => {
                  const jointY =
                    frontViewY +
                    scaledHeight -
                    (span.start + span.height) * scale;
                  return (
                    <line
                      key={`vdiv-left-joint-${i}-${lineIdx}`}
                      x1={seamX - panelThicknessPx}
                      y1={jointY}
                      x2={seamX}
                      y2={jointY}
                      stroke="#000"
                      strokeWidth="1"
                    />
                  );
                })}
                {rightSpans.slice(0, -1).map((span, lineIdx) => {
                  const jointY =
                    frontViewY +
                    scaledHeight -
                    (span.start + span.height) * scale;
                  return (
                    <line
                      key={`vdiv-right-joint-${i}-${lineIdx}`}
                      x1={seamX}
                      y1={jointY}
                      x2={seamX + panelThicknessPx}
                      y2={jointY}
                      stroke="#000"
                      strokeWidth="1"
                    />
                  );
                })}
              </g>
            );
          })}

          {/* Per-column content */}
          {columns.map((col, colIdx) => {
            const x1 = frontViewX + col.start * scale;
            const x2 = frontViewX + col.end * scale;
            const colCenterX = (x1 + x2) / 2;
            const colInnerX1 = x1 + panelThicknessPx;
            const colInnerX2 = x2 - panelThicknessPx;

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
                const shelfRects = buildEvenShelfRects({
                  x: colInnerX1,
                  width: Math.max(colInnerX2 - colInnerX1, 0),
                  topY: mapYForColumn(shelfY + tCm / 2, colIdx),
                  bottomY:
                    mapYForColumn(shelfY + tCm / 2, colIdx) + panelThicknessPx,
                  shelfCount: 1,
                  shelfThickness: panelThicknessPx,
                });
                const shelfPanel = shelfRects[0]
                  ? createPanelRect(
                      `shelf-${colIdx}-${shIdx}`,
                      shelfRects[0].x,
                      shelfRects[0].y,
                      shelfRects[0].width,
                      shelfRects[0].height,
                      innerPanelFill,
                    )
                  : null;
                if (shelfPanel) nodes.push(shelfPanel);
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
                const lowerBoundaryPanel = createPanelRect(
                  `module-boundary-lower-${colIdx}`,
                  colInnerX1,
                  mapYForColumn(moduleBoundaryYCm, colIdx),
                  Math.max(colInnerX2 - colInnerX1, 0),
                  panelThicknessPx,
                  seamPanelFill,
                );
                const upperBoundaryPanel = createPanelRect(
                  `module-boundary-upper-${colIdx}`,
                  colInnerX1,
                  mapYForColumn(moduleBoundaryYCm + tCm, colIdx),
                  Math.max(colInnerX2 - colInnerX1, 0),
                  panelThicknessPx,
                  seamPanelFill,
                );
                if (lowerBoundaryPanel) nodes.push(lowerBoundaryPanel);
                if (upperBoundaryPanel) nodes.push(upperBoundaryPanel);
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
                    const topShelfPanel = createPanelRect(
                      `top-shelf-${colIdx}-${shIdx}`,
                      colInnerX1,
                      mapYForColumn(shelfY + tCm / 2, colIdx),
                      Math.max(colInnerX2 - colInnerX1, 0),
                      panelThicknessPx,
                      innerPanelFill,
                    );
                    if (topShelfPanel) nodes.push(topShelfPanel);
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
              const compInnerX1 = compX1 + panelThicknessPx;
              const compInnerX2 = compX2 - panelThicknessPx;
              const innerPanelSpan = Math.max(compInnerX2 - compInnerX1, 0);

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
                const dividerRects = buildSectionDividerRects({
                  x: compInnerX1,
                  width: innerPanelSpan,
                  y: mapYForColumn(safeTopY, colIdx),
                  height: (safeTopY - safeBottomY) * scale,
                  sectionCount: innerCols,
                  dividerThickness: panelThicknessPx,
                });

                dividerRects.forEach((rect, divIdx) => {
                  const dividerPanel = createPanelRect(
                    `vd-${compKey}-${divIdx}`,
                    rect.x,
                    rect.y,
                    rect.width,
                    rect.height,
                    seamPanelFill,
                  );
                  if (dividerPanel) nodes.push(dividerPanel);
                });
              }

              // Draw inner shelves per section
              const sections = computeSectionBounds({
                x: compInnerX1,
                width: innerPanelSpan,
                sectionCount: innerCols,
                dividerThickness: panelThicknessPx,
              });
              for (let secIdx = 0; secIdx < innerCols; secIdx++) {
                const drawerCount = cfg.drawerCounts?.[secIdx] ?? 0;
                const shelfCount = cfg.rowCounts?.[secIdx] ?? 0;
                if (shelfCount <= 0) continue;

                const section = sections[secIdx];
                if (!section) continue;

                const secX1 = section.x;
                const secX2 = section.x + section.width;
                const usableH = safeTopY - safeBottomY;
                const gap = usableH / (shelfCount + 1);
                const visibleShelfStartIndex = getVisibleShelfStartIndex(
                  shelfCount,
                  drawerCount,
                );

                for (
                  let shIdx = visibleShelfStartIndex;
                  shIdx <= shelfCount;
                  shIdx++
                ) {
                  const shelfY = safeBottomY + shIdx * gap;
                  const innerShelfPanel = createPanelRect(
                    `ish-${compKey}-${secIdx}-${shIdx}`,
                    secX1,
                    mapYForColumn(shelfY + tCm / 2, colIdx),
                    Math.max(secX2 - secX1, 0),
                    panelThicknessPx,
                    innerPanelFill,
                  );
                  if (innerShelfPanel) nodes.push(innerShelfPanel);
                }

                if (gap > 0) {
                  for (let spaceIdx = 0; spaceIdx <= shelfCount; spaceIdx++) {
                    const spaceBottomY = safeBottomY + spaceIdx * gap;
                    const spaceTopY = safeBottomY + (spaceIdx + 1) * gap;
                    const spaceMidY = (spaceBottomY + spaceTopY) / 2;
                    const spaceMidX = (secX1 + secX2) / 2;
                    const spaceHeightCm = Math.round(gap);
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

              // Draw drawers per section (from elementConfigs.drawerCounts)
              for (let secIdx = 0; secIdx < innerCols; secIdx++) {
                const drawerCount = cfg.drawerCounts?.[secIdx] ?? 0;
                if (drawerCount <= 0) continue;
                const shelfCount = cfg.rowCounts?.[secIdx] ?? 0;
                const compInnerH = safeTopY - safeBottomY;
                if (!isDrawerCountValid(drawerCount, compInnerH, shelfCount)) {
                  continue;
                }

                const section = sections[secIdx];
                if (!section) continue;

                const isExternal = cfg.drawersExternal?.[secIdx] ?? false;
                const drawerSpan = getDrawerFrontSpan({
                  elementInnerWidthM: innerPanelSpan / scale,
                  elementOuterWidthM: (compX2 - compX1) / scale,
                  sectionCount: innerCols,
                  sectionIndex: secIdx,
                  sideThicknessM: tCm / 100,
                  isExternal,
                });
                const drawerOriginX = isExternal ? compX1 : compInnerX1;
                const secX1 = drawerOriginX + drawerSpan.start * scale;
                const secX2 = drawerOriginX + drawerSpan.end * scale;
                const secDrawerW = secX2 - secX1;
                if (secDrawerW <= 0) continue;
                const stack = getDrawerStackMetrics(
                  compInnerH / 100,
                  shelfCount,
                  drawerCount,
                );
                const drawerH = shouldUseDrawerStack(drawerCount)
                  ? stack.slotHeight * 100
                  : shelfCount > 0
                    ? compInnerH / (shelfCount + 1)
                    : compInnerH / drawerCount;
                const drawerGap = Math.min(1, drawerH * 0.03); // small visual gap

                const visibleDrawerCount = shouldUseDrawerStack(drawerCount)
                  ? stack.drawerCount
                  : drawerCount;

                for (let drIdx = 0; drIdx < visibleDrawerCount; drIdx++) {
                  const drawerBottomY = safeBottomY + drIdx * drawerH;
                  const drawerTopY = Math.min(
                    drawerBottomY + drawerH - drawerGap,
                    safeTopY,
                  );

                  if (drawerTopY > drawerBottomY) {
                    nodes.push(
                      <rect
                        key={`drawer-${compKey}-${secIdx}-${drIdx}`}
                        x={secX1}
                        y={mapYForColumn(drawerTopY, colIdx)}
                        width={secDrawerW}
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
                const rodY = safeTopY - 6; // 6cm from top
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
        <BlueprintSideView
          sideViewX={sideViewX}
          sideViewY={sideViewY}
          scaledDepth={scaledDepth}
          scaledHeight={scaledHeight}
          scaledBaseHeight={scaledBaseHeight}
          scale={scale}
          depth={depth}
          height={height}
          hasBase={hasBase}
          columns={columns}
          columnHeights={columnHeights}
          columnModuleBoundaries={columnModuleBoundaries}
        />
      </svg>
    </div>
  );
}
