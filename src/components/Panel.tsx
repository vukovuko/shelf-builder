"use client";

import React, { useMemo } from "react";
import { Edges, Line } from "@react-three/drei";

interface PanelProps {
  position: [number, number, number];
  size: [number, number, number];
  showEdgesOnly?: boolean;
}

// Custom comparison for arrays - prevents re-render if values are same
function areEqual(prev: PanelProps, next: PanelProps): boolean {
  // Compare showEdgesOnly
  if (prev.showEdgesOnly !== next.showEdgesOnly) {
    return false;
  }
  // Compare position array values
  if (
    prev.position[0] !== next.position[0] ||
    prev.position[1] !== next.position[1] ||
    prev.position[2] !== next.position[2]
  ) {
    return false;
  }
  // Compare size array values
  if (
    prev.size[0] !== next.size[0] ||
    prev.size[1] !== next.size[1] ||
    prev.size[2] !== next.size[2]
  ) {
    return false;
  }
  return true;
}

// A simple, reusable panel component. It's just a mesh with a box geometry.
// Wrapped in React.memo to prevent re-renders when position/size values unchanged
export const Panel = React.memo(function Panel({
  position,
  size,
  showEdgesOnly = false,
}: PanelProps) {
  // Validate and sanitize size to prevent NaN or invalid values
  const safeSize = size.map((v) => {
    if (typeof v !== "number" || Number.isNaN(v) || !Number.isFinite(v))
      return 0.001;
    return Math.max(Math.abs(v), 0.001);
  }) as [number, number, number];

  const safePosition = position.map((v) =>
    typeof v === "number" && Number.isFinite(v) ? v : 0,
  ) as [number, number, number];

  const geoKey = `${safeSize[0]}-${safeSize[1]}-${safeSize[2]}`;

  // Edges-only mode: render as rectangle outline (for "Preuzmi Ivice" download)
  // Uses Line to draw explicit black rectangle edges
  const edgePoints = useMemo(() => {
    const hw = safeSize[0] / 2; // half width
    const hh = safeSize[1] / 2; // half height
    // Rectangle corners (closed loop)
    return [
      [-hw, -hh, 0],
      [hw, -hh, 0],
      [hw, hh, 0],
      [-hw, hh, 0],
      [-hw, -hh, 0], // Close the loop
    ] as [number, number, number][];
  }, [safeSize[0], safeSize[1]]);

  if (showEdgesOnly) {
    // Flatten Z to 0 for true 2D front projection (depth = 0)
    return (
      <group position={[safePosition[0], safePosition[1], 0]}>
        <Line points={edgePoints} color="#000000" lineWidth={1} />
      </group>
    );
  }

  // Normal 3D mode
  return (
    <mesh position={safePosition} castShadow receiveShadow>
      <boxGeometry key={geoKey} args={safeSize} />
      <meshStandardMaterial
        color="#f8f6f4"
        roughness={0.85}
        metalness={0}
        polygonOffset
        polygonOffsetFactor={1.5}
        polygonOffsetUnits={1.5}
      />
      <Edges key={`e-${geoKey}`} threshold={15} color="#4a4458" />
    </mesh>
  );
}, areEqual);
