"use client";

import { Line } from "@react-three/drei";

interface SelectionBorderLinesProps {
  // Bounds of the compartment (in meters, local coords)
  left: number;
  right: number;
  bottom: number;
  top: number;
  // Z position (front of wardrobe)
  z: number;
  // Color for the border
  color?: string;
  // Which sides to draw (for merging adjacent selections)
  showTop?: boolean;
  showBottom?: boolean;
  showLeft?: boolean;
  showRight?: boolean;
}

/**
 * Renders a dashed border around a compartment.
 * Supports selective sides to merge adjacent selected compartments visually.
 */
export function SelectionBorderLines({
  left,
  right,
  bottom,
  top,
  z,
  color = "#cba6f7", // Catppuccin Mauve (consistent with selection UI)
  showTop = true,
  showBottom = true,
  showLeft = true,
  showRight = true,
}: SelectionBorderLinesProps) {
  // Inset the border slightly inside the compartment edges (5mm)
  const inset = 0.005;
  const l = left + inset;
  const r = right - inset;
  const b = bottom + inset;
  const t = top - inset;

  const lines: React.ReactNode[] = [];

  if (showTop) {
    lines.push(
      <Line
        key="top"
        points={[
          [l, t, z],
          [r, t, z],
        ]}
        color={color}
        lineWidth={5}
        dashed
        dashSize={0.05}
        gapSize={0.025}
      />,
    );
  }

  if (showBottom) {
    lines.push(
      <Line
        key="bottom"
        points={[
          [l, b, z],
          [r, b, z],
        ]}
        color={color}
        lineWidth={5}
        dashed
        dashSize={0.05}
        gapSize={0.025}
      />,
    );
  }

  if (showLeft) {
    lines.push(
      <Line
        key="left"
        points={[
          [l, b, z],
          [l, t, z],
        ]}
        color={color}
        lineWidth={5}
        dashed
        dashSize={0.05}
        gapSize={0.025}
      />,
    );
  }

  if (showRight) {
    lines.push(
      <Line
        key="right"
        points={[
          [r, b, z],
          [r, t, z],
        ]}
        color={color}
        lineWidth={5}
        dashed
        dashSize={0.05}
        gapSize={0.025}
      />,
    );
  }

  return <>{lines}</>;
}
