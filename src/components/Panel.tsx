"use client";

import React from "react";
import { Edges } from "@react-three/drei";

interface PanelProps {
  position: [number, number, number];
  size: [number, number, number];
}

// Custom comparison for arrays - prevents re-render if values are same
function areEqual(prev: PanelProps, next: PanelProps): boolean {
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
export const Panel = React.memo(function Panel({ position, size }: PanelProps) {
  // Defensive: Clamp all sizes to minimum 0.001 and ensure no NaN
  const safeSize = size.map((v) => {
    if (typeof v !== "number" || Number.isNaN(v) || !Number.isFinite(v))
      return 0.001;
    return Math.max(Math.abs(v), 0.001);
  }) as [number, number, number];
  const safePosition = position.map((v) =>
    typeof v === "number" && Number.isFinite(v) ? v : 0,
  ) as [number, number, number];

  // Key based on size to force geometry/edges recreation when dimensions change
  const geoKey = `${safeSize[0]}-${safeSize[1]}-${safeSize[2]}`;

  return (
    <mesh position={safePosition} castShadow receiveShadow>
      <boxGeometry key={geoKey} args={safeSize} />
      {/* Panel color: cream white for contrast against dark background */}
      <meshStandardMaterial
        color="#f8f6f4"
        roughness={0.85}
        metalness={0}
        polygonOffset
        polygonOffsetFactor={1}
        polygonOffsetUnits={1}
      />
      {/* Edge color: muted purple from theme (--border in dark mode) */}
      <Edges key={`e-${geoKey}`} threshold={15} color="#4a4458" />
    </mesh>
  );
}, areEqual);
