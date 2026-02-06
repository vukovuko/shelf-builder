interface BlueprintSideViewProps {
  sideViewX: number;
  sideViewY: number;
  scaledDepth: number;
  scaledHeight: number;
  scaledBaseHeight: number;
  scale: number;
  depth: number;
  height: number;
  hasBase: boolean;
  columns: { start: number; end: number; width: number }[];
  columnHeights: Record<number, number>;
}

export function BlueprintSideView({
  sideViewX,
  sideViewY,
  scaledDepth,
  scaledHeight,
  scaledBaseHeight,
  scale,
  depth,
  height,
  hasBase,
  columns,
  columnHeights,
}: BlueprintSideViewProps) {
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
}
