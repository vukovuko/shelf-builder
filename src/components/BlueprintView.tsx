"use client";

import type React from "react";
import { useShelfStore, type Material } from "@/lib/store";
import {
  MAX_SEGMENT_X_CM,
  TARGET_BOTTOM_HEIGHT_CM,
  MIN_TOP_HEIGHT_CM,
  DRAWER_HEIGHT_CM,
  DRAWER_GAP_CM,
} from "@/lib/wardrobe-constants";

export function BlueprintView() {
  const {
    width,
    height,
    depth,
    hasBase,
    baseHeight,
    elementConfigs,
    selectedMaterialId,
    compartmentExtras,
    doorSelections,
    materials,
  } = useShelfStore();

  const fmt2 = (n: number) =>
    Number(n ?? 0).toLocaleString(undefined, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });

  // Material thickness (cm)
  const mat = materials.find((m: Material) => m.id === selectedMaterialId);
  const tCm = Number(mat?.thickness ?? 18) / 10; // thickness in cm
  const _backTCm = 0.5; // assume 5mm backs for hatch if needed

  // Calculate drawing dimensions and scale
  const padding = 60;
  const viewBoxWidth = 800;
  const viewBoxHeight = 600;
  const maxDrawingWidth = viewBoxWidth - padding * 2;
  const maxDrawingHeight = viewBoxHeight - padding * 2;

  // Calculate scale to fit both front and side views
  const frontViewWidth = Math.max(width, depth);
  const frontViewHeight = height;
  const scaleX = maxDrawingWidth / (frontViewWidth + depth + 50); // 50 for spacing between views
  const scaleY = maxDrawingHeight / frontViewHeight;
  const scale = Math.min(scaleX, scaleY, 2); // Max scale of 2

  // Scaled dimensions
  const scaledWidth = width * scale;
  const scaledHeight = height * scale;
  const scaledDepth = depth * scale;
  const scaledBaseHeight = hasBase ? baseHeight * scale : 0;

  // Positioning - shifted right to prevent clipping
  const frontViewX = padding + 20;
  const frontViewY = padding + (maxDrawingHeight - scaledHeight) / 2;
  const sideViewX = frontViewX + scaledWidth + 50;
  const sideViewY = frontViewY;

  // Calculate element blocks for front view dimensions
  const nBlocksX = Math.max(1, Math.ceil(width / MAX_SEGMENT_X_CM));
  const blockWidth = width / nBlocksX;

  // Calculate Y modules for height segmentation
  const modulesY = [];
  if (height > TARGET_BOTTOM_HEIGHT_CM) {
    const bottomH =
      height - TARGET_BOTTOM_HEIGHT_CM < MIN_TOP_HEIGHT_CM
        ? height - MIN_TOP_HEIGHT_CM
        : TARGET_BOTTOM_HEIGHT_CM;
    modulesY.push({ start: 0, height: bottomH, label: "Bottom" });
    modulesY.push({ start: bottomH, height: height - bottomH, label: "Top" });
  } else {
    modulesY.push({ start: 0, height: height, label: "Single" });
  }

  // Map from a value measured from the bottom (in cm) to SVG Y (top-origin)
  const mapYFront = (yFromBottomCm: number) =>
    frontViewY + scaledHeight - yFromBottomCm * scale;

  // Helper function to create dimension line with arrows
  const createDimensionLine = (
    x1: number,
    y1: number,
    x2: number,
    y2: number,
    label: string,
    offset: number = 20,
  ) => {
    const isVertical = Math.abs(x2 - x1) < Math.abs(y2 - y1);
    const midX = (x1 + x2) / 2;
    const midY = (y1 + y2) / 2;

    if (isVertical) {
      // Vertical dimension line
      const lineX = x1 + offset;
      return (
        <g key={`dim-${label}-${x1}-${y1}`}>
          {/* Extension lines */}
          <line
            x1={x1}
            y1={y1}
            x2={lineX}
            y2={y1}
            stroke="#666"
            strokeWidth="0.5"
          />
          <line
            x1={x1}
            y1={y2}
            x2={lineX}
            y2={y2}
            stroke="#666"
            strokeWidth="0.5"
          />

          {/* Main dimension line */}
          <line
            x1={lineX}
            y1={y1}
            x2={lineX}
            y2={y2}
            stroke="#000"
            strokeWidth="1"
          />

          {/* Arrows */}
          <polygon
            points={`${lineX - 3},${y1 + 8} ${lineX + 3},${
              y1 + 8
            } ${lineX},${y1}`}
            fill="#000"
          />
          <polygon
            points={`${lineX - 3},${y2 - 8} ${lineX + 3},${
              y2 - 8
            } ${lineX},${y2}`}
            fill="#000"
          />

          {/* Label */}
          <text
            x={lineX + 8}
            y={midY}
            fontSize="10"
            textAnchor="start"
            dominantBaseline="middle"
            fill="#000"
            transform={`rotate(-90 ${lineX + 8} ${midY})`}
          >
            {label} cm
          </text>
        </g>
      );
    } else {
      // Horizontal dimension line
      const lineY = y1 + offset;
      return (
        <g key={`dim-${label}-${x1}-${y1}`}>
          {/* Extension lines */}
          <line
            x1={x1}
            y1={y1}
            x2={x1}
            y2={lineY}
            stroke="#666"
            strokeWidth="0.5"
          />
          <line
            x1={x2}
            y1={y1}
            x2={x2}
            y2={lineY}
            stroke="#666"
            strokeWidth="0.5"
          />

          {/* Main dimension line */}
          <line
            x1={x1}
            y1={lineY}
            x2={x2}
            y2={lineY}
            stroke="#000"
            strokeWidth="1"
          />

          {/* Arrows */}
          <polygon
            points={`${x1 + 8},${lineY - 3} ${x1 + 8},${
              lineY + 3
            } ${x1},${lineY}`}
            fill="#000"
          />
          <polygon
            points={`${x2 - 8},${lineY - 3} ${x2 - 8},${
              lineY + 3
            } ${x2},${lineY}`}
            fill="#000"
          />

          {/* Label */}
          <text
            x={midX}
            y={lineY - 8}
            fontSize="10"
            textAnchor="middle"
            dominantBaseline="middle"
            fill="#000"
          >
            {label} cm
          </text>
        </g>
      );
    }
  };

  // Helpers
  const toLetter = (i: number) => {
    let n = i + 1;
    let s = "";
    while (n > 0) {
      const rem = (n - 1) % 26;
      s = String.fromCharCode(65 + rem) + s;
      n = Math.floor((n - 1) / 26);
    }
    return s;
  };

  return (
    <div className="w-full h-full bg-white flex items-center justify-center">
      <svg
        width="100%"
        height="100%"
        viewBox={`0 0 ${viewBoxWidth} ${viewBoxHeight}`}
        className="border border-gray-200"
      >
        <defs>
          <pattern
            id="hatch"
            patternUnits="userSpaceOnUse"
            width="4"
            height="4"
          >
            <path
              d="M 0,4 L 4,0 M -1,1 L 1,-1 M 3,5 L 5,3"
              stroke="#ccc"
              strokeWidth="0.5"
            />
          </pattern>
        </defs>

        {/* Front Elevation */}
        <g>
          <text
            x={frontViewX}
            y={frontViewY - 20}
            fontSize="14"
            fontWeight="bold"
            fill="#000"
          >
            Front Elevation
          </text>

          {/* Main frame */}
          <rect
            x={frontViewX}
            y={frontViewY}
            width={scaledWidth}
            height={scaledHeight}
            fill="none"
            stroke="#000"
            strokeWidth="2"
          />

          {/* Base if present */}
          {hasBase && scaledBaseHeight > 0 && (
            <rect
              x={frontViewX}
              y={frontViewY + scaledHeight - scaledBaseHeight}
              width={scaledWidth}
              height={scaledBaseHeight}
              fill="url(#hatch)"
              stroke="#000"
              strokeWidth="1"
            />
          )}

          {/* Vertical dividers for blocks - stop at base, don't go through it */}
          {Array.from({ length: nBlocksX - 1 }, (_, i) => {
            const dividerX = frontViewX + (i + 1) * blockWidth * scale;
            return (
              <line
                key={`divider-${i}`}
                x1={dividerX}
                y1={frontViewY}
                x2={dividerX}
                y2={frontViewY + scaledHeight - scaledBaseHeight}
                stroke="#000"
                strokeWidth="1"
              />
            );
          })}

          {/* Horizontal dividers for modules */}
          {modulesY.length > 1 &&
            modulesY.slice(0, -1).map((module, i) => {
              // Horizontal divider at the top of the lower module
              const dividerY = mapYFront(module.start + module.height);
              return (
                <line
                  key={`h-divider-${i}`}
                  x1={frontViewX}
                  y1={dividerY}
                  x2={frontViewX + scaledWidth}
                  y2={dividerY}
                  stroke="#000"
                  strokeWidth="1"
                />
              );
            })}

          {/* Element labels */}
          {(() => {
            const labels: React.ReactNode[] = [];
            let elementIndex = 0;

            modulesY.forEach((module, _moduleIdx) => {
              for (let blockIdx = 0; blockIdx < nBlocksX; blockIdx++) {
                const letter = String.fromCharCode(65 + elementIndex); // A, B, C...
                const labelX =
                  frontViewX + (blockIdx * blockWidth + blockWidth / 2) * scale;
                const labelY = mapYFront(module.start + module.height / 2);

                labels.push(
                  <text
                    key={`label-${elementIndex}`}
                    x={labelX}
                    y={labelY}
                    fontSize="12"
                    fontWeight="bold"
                    textAnchor="middle"
                    dominantBaseline="middle"
                    fill="#000"
                  >
                    {letter}
                  </text>,
                );
                elementIndex++;
              }
            });

            return labels;
          })()}

          {/* Internal structure per element */}
          {(() => {
            const nodes: React.ReactNode[] = [];
            let idx = 0;
            for (let mIdx = 0; mIdx < modulesY.length; mIdx++) {
              const m = modulesY[mIdx];
              for (let bIdx = 0; bIdx < nBlocksX; bIdx++) {
                const letter = toLetter(idx);
                const ex = frontViewX + bIdx * blockWidth * scale;
                const eyBottom = m.start * scale; // in cm*scale from bottom
                const ew = blockWidth * scale;
                const eh = m.height * scale;
                // Inner bounds (subtract panel thickness)
                const ix0 = ex + tCm * scale;
                const ix1 = ex + ew - tCm * scale;
                const iy0BaseFromBottom = eyBottom + tCm * scale; // distance from bottom
                const iy1FromBottom = eyBottom + eh - tCm * scale;
                const raiseByBase =
                  hasBase && (modulesY.length === 1 || mIdx === 0)
                    ? baseHeight * scale
                    : 0;
                const iy0FromBottom = iy0BaseFromBottom + raiseByBase;

                // Columns (compartments) from elementConfigs
                const cfg = (elementConfigs as any)[letter] ?? {
                  columns: 1,
                  rowCounts: [0],
                };
                const cols = Math.max(1, Number(cfg.columns) || 1);
                const colBounds: number[] = [];
                for (let c = 0; c <= cols; c++) {
                  const x = ix0 + (c * (ix1 - ix0)) / cols;
                  colBounds.push(x);
                }
                // Draw internal verticals between compartments
                for (let c = 1; c < cols; c++) {
                  const x = colBounds[c];
                  nodes.push(
                    <line
                      key={`iv-${letter}-${mIdx}-${c}`}
                      x1={x}
                      y1={mapYFront(iy0FromBottom / scale)}
                      x2={x}
                      y2={mapYFront(iy1FromBottom / scale)}
                      stroke="#000"
                      strokeWidth={1}
                    />,
                  );
                }
                // Optional central vertical divider (Extras)
                const extras = (compartmentExtras as any)[letter] ?? {};
                if (extras.verticalDivider) {
                  const x = (ix0 + ix1) / 2;
                  nodes.push(
                    <line
                      key={`ivc-${letter}-${mIdx}`}
                      x1={x}
                      y1={mapYFront(iy0FromBottom / scale)}
                      x2={x}
                      y2={mapYFront(iy1FromBottom / scale)}
                      stroke="#000"
                      strokeDasharray="3 2"
                      strokeWidth={1}
                    />,
                  );
                }

                // Drawers region (full inner width)
                if (extras.drawers) {
                  // Work in centimeters to prevent off-by-height errors
                  const drawerHcm = DRAWER_HEIGHT_CM;
                  const gapCm = DRAWER_GAP_CM;
                  const iy0FromBottomCm = iy0FromBottom / scale;
                  const iy1FromBottomCm = iy1FromBottom / scale;
                  const innerHForDrawersCm = Math.max(
                    iy1FromBottomCm - iy0FromBottomCm,
                    0,
                  );
                  const maxAuto = Math.max(
                    0,
                    Math.floor(
                      (innerHForDrawersCm + gapCm) / (drawerHcm + gapCm),
                    ),
                  );
                  const countFromState = Math.max(
                    0,
                    Math.floor(Number(extras.drawersCount ?? 0)),
                  );
                  const used =
                    countFromState > 0
                      ? Math.min(countFromState, maxAuto)
                      : maxAuto;
                  for (let d = 0; d < used; d++) {
                    // Bottom of drawer d measured from inner bottom
                    const bottomCm = iy0FromBottomCm + d * (drawerHcm + gapCm);
                    // Top of drawer is one drawer height above bottom, clamped to inner top minus gap
                    const topCm = Math.min(
                      bottomCm + drawerHcm,
                      iy1FromBottomCm - gapCm,
                    );
                    const topY = mapYFront(topCm);
                    const bottomY = mapYFront(bottomCm);
                    const heightPx = Math.max(0, bottomY - topY);
                    nodes.push(
                      <rect
                        key={`drw-${letter}-${mIdx}-${d}`}
                        x={ix0}
                        y={topY}
                        width={ix1 - ix0}
                        height={heightPx}
                        fill="none"
                        stroke="#000"
                        strokeWidth={1}
                      />,
                    );
                  }
                  // Auto shelf directly above drawers if space remains
                  if (used > 0 && used < maxAuto) {
                    const lastBottomCm =
                      iy0FromBottomCm + (used - 1) * (drawerHcm + gapCm);
                    const lastTopCm = Math.min(
                      lastBottomCm + drawerHcm,
                      iy1FromBottomCm - gapCm,
                    );
                    const shelfFromBottomCm = lastTopCm + gapCm + tCm;
                    if (shelfFromBottomCm < iy1FromBottomCm) {
                      nodes.push(
                        <line
                          key={`auto-shelf-${letter}-${mIdx}`}
                          x1={ix0}
                          y1={mapYFront(shelfFromBottomCm)}
                          x2={ix1}
                          y2={mapYFront(shelfFromBottomCm)}
                          stroke="#000"
                          strokeWidth={1}
                        />,
                      );
                    }
                  }
                }

                // Shelves per compartment
                for (let c = 0; c < cols; c++) {
                  const count = Math.max(
                    0,
                    Math.floor(Number(cfg.rowCounts?.[c] ?? 0)),
                  );
                  if (count <= 0) continue;
                  const cx0 = colBounds[c];
                  const cx1 = colBounds[c + 1];
                  const availableH = Math.max(iy1FromBottom - iy0FromBottom, 0);
                  for (let s = 1; s <= count; s++) {
                    const yFromBottom =
                      iy0FromBottom + (availableH * s) / (count + 1);
                    nodes.push(
                      <line
                        key={`shelf-${letter}-${mIdx}-${c}-${s}`}
                        x1={cx0}
                        y1={mapYFront(yFromBottom / scale)}
                        x2={cx1}
                        y2={mapYFront(yFromBottom / scale)}
                        stroke="#000"
                        strokeWidth={1}
                      />,
                    );
                  }
                }

                // Rod indicator
                if (extras.rod) {
                  const ryFromBottom =
                    iy0FromBottom + (iy1FromBottom - iy0FromBottom) * 0.25;
                  nodes.push(
                    <line
                      key={`rod-${letter}-${mIdx}`}
                      x1={ix0 + 6}
                      y1={mapYFront(ryFromBottom / scale)}
                      x2={ix1 - 6}
                      y2={mapYFront(ryFromBottom / scale)}
                      stroke="#000"
                      strokeWidth={2}
                    />,
                  );
                }

                // LED label
                if (extras.led) {
                  nodes.push(
                    <text
                      key={`led-${letter}-${mIdx}`}
                      x={(ix0 + ix1) / 2}
                      y={mapYFront(iy0FromBottom / scale) + 12}
                      fontSize="10"
                      textAnchor="middle"
                      fill="#000"
                    >
                      LED
                    </text>,
                  );
                }

                // Doors outline on front
                const doorSel = (doorSelections as any)[letter];
                if (doorSel && doorSel !== "none") {
                  const clearance = 0.1 * scale; // 1mm each side ~0.1cm
                  const doubleGap = 0.3 * scale; // 3mm
                  const availW = Math.max(ew - 2 * tCm * scale - clearance, 0);
                  const leafH = Math.max(eh - 2 * tCm * scale - clearance, 0);
                  const ox = ex + tCm * scale + clearance / 2;
                  const oy = mapYFront(
                    eyBottom / scale + (tCm + clearance / (2 * scale)),
                  );
                  if (doorSel === "double" || doorSel === "doubleMirror") {
                    const leafW = Math.max((availW - doubleGap) / 2, 0);
                    nodes.push(
                      <rect
                        key={`doorL-${letter}-${mIdx}`}
                        x={ox}
                        y={oy}
                        width={leafW}
                        height={leafH}
                        fill="none"
                        stroke="#000"
                        strokeDasharray="4 2"
                      />,
                    );
                    nodes.push(
                      <rect
                        key={`doorR-${letter}-${mIdx}`}
                        x={ox + leafW + doubleGap}
                        y={oy}
                        width={leafW}
                        height={leafH}
                        fill="none"
                        stroke="#000"
                        strokeDasharray="4 2"
                      />,
                    );
                  } else {
                    nodes.push(
                      <rect
                        key={`door-${letter}-${mIdx}`}
                        x={ox}
                        y={oy}
                        width={availW}
                        height={leafH}
                        fill="none"
                        stroke="#000"
                        strokeDasharray="4 2"
                      />,
                    );
                  }
                }

                // Per-element compartment width dimensions (above element)
                if (cols > 1) {
                  const yLabel = mapYFront((eyBottom + eh) / scale) - 10; // above element
                  for (let c = 0; c < cols; c++) {
                    const x1 = colBounds[c];
                    const x2 = colBounds[c + 1];
                    const lab = fmt2((x2 - x1) / scale);
                    nodes.push(
                      createDimensionLine(
                        x1,
                        yLabel,
                        x2,
                        yLabel,
                        lab,
                        -12,
                      ) as any,
                    );
                  }
                }

                idx += 1;
              }
            }
            return nodes;
          })()}

          {/* Front view dimensions */}
          {/* Overall width */}
          {createDimensionLine(
            frontViewX,
            frontViewY + scaledHeight + 40,
            frontViewX + scaledWidth,
            frontViewY + scaledHeight + 40,
            fmt2(width),
          )}

          {/* Block widths */}
          {Array.from({ length: nBlocksX }, (_, i) => {
            const x1 = frontViewX + i * blockWidth * scale;
            const x2 = frontViewX + (i + 1) * blockWidth * scale;
            return createDimensionLine(
              x1,
              frontViewY + scaledHeight + 65,
              x2,
              frontViewY + scaledHeight + 65,
              fmt2(blockWidth),
            );
          })}

          {/* Overall height */}
          {createDimensionLine(
            frontViewX - 40,
            mapYFront(height),
            frontViewX - 40,
            mapYFront(0),
            fmt2(height),
          )}

          {/* Module heights */}
          {modulesY.map((module, _i) => {
            const y1 = mapYFront(module.start + module.height);
            const y2 = mapYFront(module.start);
            return createDimensionLine(
              frontViewX - 65,
              y1,
              frontViewX - 65,
              y2,
              fmt2(module.height),
            );
          })}

          {/* Base height if present */}
          {hasBase &&
            baseHeight > 0 &&
            createDimensionLine(
              frontViewX - 90,
              mapYFront(baseHeight),
              frontViewX - 90,
              mapYFront(0),
              fmt2(baseHeight),
            )}
        </g>

        {/* Side Elevation */}
        <g>
          <text
            x={sideViewX}
            y={sideViewY - 20}
            fontSize="14"
            fontWeight="bold"
            fill="#000"
          >
            Side Elevation
          </text>

          {/* Main frame */}
          <rect
            x={sideViewX}
            y={sideViewY}
            width={scaledDepth}
            height={scaledHeight}
            fill="none"
            stroke="#000"
            strokeWidth="2"
          />

          {/* Base if present */}
          {hasBase && scaledBaseHeight > 0 && (
            <rect
              x={sideViewX}
              y={sideViewY + scaledHeight - scaledBaseHeight}
              width={scaledDepth}
              height={scaledBaseHeight}
              fill="url(#hatch)"
              stroke="#000"
              strokeWidth="1"
            />
          )}

          {/* Horizontal dividers for modules */}
          {modulesY.length > 1 &&
            modulesY.slice(0, -1).map((module, i) => {
              const dividerY =
                sideViewY + (module.start + module.height) * scale;
              return (
                <line
                  key={`side-h-divider-${i}`}
                  x1={sideViewX}
                  y1={dividerY}
                  x2={sideViewX + scaledDepth}
                  y2={dividerY}
                  stroke="#000"
                  strokeWidth="1"
                />
              );
            })}

          {/* Side view dimensions */}
          {/* Overall depth */}
          {createDimensionLine(
            sideViewX,
            sideViewY + scaledHeight + 40,
            sideViewX + scaledDepth,
            sideViewY + scaledHeight + 40,
            depth.toString(),
          )}

          {/* Overall height */}
          {createDimensionLine(
            sideViewX - 40,
            sideViewY,
            sideViewX - 40,
            sideViewY + scaledHeight,
            height.toString(),
          )}
        </g>

        {/* Title */}
        <text
          x={viewBoxWidth / 2}
          y={30}
          fontSize="16"
          fontWeight="bold"
          textAnchor="middle"
          fill="#000"
        >
          Wardrobe Technical Drawing
        </text>
      </svg>
    </div>
  );
}
