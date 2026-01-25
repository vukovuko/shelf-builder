"use client";

export function CompartmentSchematic({ className }: { className?: string }) {
  // Fixed dimensions for static illustration
  const w = 180;
  const h = 140;
  const cols = 3;
  const rows = 2;
  const colW = w / cols;
  const rowH = h / rows;

  // Catppuccin Mocha colors
  const bg = "#1e1e2e";
  const surface = "#313244";
  const highlight = "#89b4fa";
  const stroke = "#585b70";
  const text = "#cdd6f4";

  // Highlighted compartment (center-bottom)
  const highlightCol = 1;
  const highlightRow = 1;

  // Cursor position (pointing at highlighted compartment)
  const cursorX = colW * highlightCol + colW * 0.6;
  const cursorY = rowH * highlightRow + rowH * 0.5;

  return (
    <svg
      width={w + 40}
      height={h + 20}
      className={className}
      style={{ display: "block", margin: "0 auto" }}
    >
      {/* Wardrobe outline */}
      <rect
        x={20}
        y={10}
        width={w}
        height={h}
        fill={bg}
        stroke={stroke}
        strokeWidth={2}
        rx={2}
      />

      {/* Grid of compartments */}
      {Array.from({ length: cols }).map((_, col) =>
        Array.from({ length: rows }).map((_, row) => {
          const isHighlighted = col === highlightCol && row === highlightRow;
          return (
            <rect
              key={`${col}-${row}`}
              x={20 + col * colW + 2}
              y={10 + row * rowH + 2}
              width={colW - 4}
              height={rowH - 4}
              fill={isHighlighted ? highlight : surface}
              stroke={isHighlighted ? highlight : stroke}
              strokeWidth={1}
              rx={1}
            />
          );
        }),
      )}

      {/* Click ripple circles */}
      <circle
        cx={20 + cursorX}
        cy={10 + cursorY}
        r={12}
        fill="none"
        stroke={text}
        strokeWidth={1}
        opacity={0.3}
      />
      <circle
        cx={20 + cursorX}
        cy={10 + cursorY}
        r={6}
        fill="none"
        stroke={text}
        strokeWidth={1.5}
        opacity={0.6}
      />

      {/* Mouse cursor icon */}
      <g transform={`translate(${20 + cursorX - 2}, ${10 + cursorY - 2})`}>
        <path
          d="M0 0 L0 14 L4 11 L7 17 L9 16 L6 10 L11 10 Z"
          fill={text}
          stroke={bg}
          strokeWidth={1}
        />
      </g>
    </svg>
  );
}
