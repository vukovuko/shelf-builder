"use client";

import { Edges } from "@react-three/drei";

interface PanelProps {
  position: [number, number, number];
  size: [number, number, number];
}

// A simple, reusable panel component. It's just a mesh with a box geometry.
export function Panel({ position, size }: PanelProps) {
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
}
