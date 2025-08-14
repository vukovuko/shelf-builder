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
    if (typeof v !== "number" || isNaN(v) || !isFinite(v)) return 0.001;
    return Math.max(Math.abs(v), 0.001);
  }) as [number, number, number];
  const safePosition = position.map((v) => (typeof v === "number" && isFinite(v) ? v : 0)) as [number, number, number];
  return (
    <mesh position={safePosition} castShadow receiveShadow>
      <boxGeometry args={safeSize} />
      {/* The material will be defined on the parent so all panels match */}
      <Edges scale={1} threshold={15} color="black" /> {/* Black edge lines */}
    </mesh>
  );
}
