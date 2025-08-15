"use client";

import React from "react";
import { useShelfStore } from "@/lib/store";

export function BlueprintView() {
  const { width, height, depth, hasBase, baseHeight, elementConfigs } =
    useShelfStore();

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
  const maxSegX = 100; // 100cm max per block
  const nBlocksX = Math.max(1, Math.ceil(width / maxSegX));
  const blockWidth = width / nBlocksX;

  // Calculate Y modules for height segmentation
  const modulesY = [];
  if (height > 200) {
    const targetBottomH = 200;
    const minTopH = 10;
    const bottomH =
      height - targetBottomH < minTopH ? height - minTopH : targetBottomH;
    modulesY.push({ start: 0, height: bottomH, label: "Bottom" });
    modulesY.push({ start: bottomH, height: height - bottomH, label: "Top" });
  } else {
    modulesY.push({ start: 0, height: height, label: "Single" });
  }

  // Helper function to create dimension line with arrows
  const createDimensionLine = (
    x1: number,
    y1: number,
    x2: number,
    y2: number,
    label: string,
    offset: number = 20
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

          {/* Vertical dividers for blocks */}
          {Array.from({ length: nBlocksX - 1 }, (_, i) => {
            const dividerX = frontViewX + (i + 1) * blockWidth * scale;
            return (
              <line
                key={`divider-${i}`}
                x1={dividerX}
                y1={frontViewY}
                x2={dividerX}
                y2={frontViewY + scaledHeight}
                stroke="#000"
                strokeWidth="1"
              />
            );
          })}

          {/* Horizontal dividers for modules */}
          {modulesY.length > 1 &&
            modulesY.slice(0, -1).map((module, i) => {
              const dividerY =
                frontViewY + (module.start + module.height) * scale;
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

            modulesY.forEach((module, moduleIdx) => {
              for (let blockIdx = 0; blockIdx < nBlocksX; blockIdx++) {
                const letter = String.fromCharCode(65 + elementIndex); // A, B, C...
                const labelX =
                  frontViewX + (blockIdx * blockWidth + blockWidth / 2) * scale;
                const labelY =
                  frontViewY + (module.start + module.height / 2) * scale;

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
                  </text>
                );
                elementIndex++;
              }
            });

            return labels;
          })()}

          {/* Front view dimensions */}
          {/* Overall width */}
          {createDimensionLine(
            frontViewX,
            frontViewY + scaledHeight + 40,
            frontViewX + scaledWidth,
            frontViewY + scaledHeight + 40,
            width.toString()
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
              Math.round(blockWidth).toString()
            );
          })}

          {/* Overall height */}
          {createDimensionLine(
            frontViewX - 40,
            frontViewY,
            frontViewX - 40,
            frontViewY + scaledHeight,
            height.toString()
          )}

          {/* Module heights */}
          {modulesY.map((module, i) => {
            const y1 = frontViewY + module.start * scale;
            const y2 = frontViewY + (module.start + module.height) * scale;
            return createDimensionLine(
              frontViewX - 65,
              y1,
              frontViewX - 65,
              y2,
              Math.round(module.height).toString()
            );
          })}

          {/* Base height if present */}
          {hasBase &&
            baseHeight > 0 &&
            createDimensionLine(
              frontViewX - 90,
              frontViewY + scaledHeight - scaledBaseHeight,
              frontViewX - 90,
              frontViewY + scaledHeight,
              baseHeight.toString()
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
            depth.toString()
          )}

          {/* Overall height */}
          {createDimensionLine(
            sideViewX - 40,
            sideViewY,
            sideViewX - 40,
            sideViewY + scaledHeight,
            height.toString()
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
