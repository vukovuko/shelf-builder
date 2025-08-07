"use client";

import { Edges } from "@react-three/drei";

interface PanelProps {
  position: [number, number, number];
  size: [number, number, number];
}

// A simple, reusable panel component. It's just a mesh with a box geometry.
export function Panel({ position, size }: PanelProps) {
  return (
    <mesh position={position} castShadow receiveShadow>
      <boxGeometry args={size} />
      {/* The material will be defined on the parent so all panels match */}
      <Edges scale={1} threshold={15} color="black" /> {/* Black edge lines */}
    </mesh>
  );
}
