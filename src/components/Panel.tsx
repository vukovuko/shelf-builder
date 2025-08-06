"use client";

interface PanelProps {
  position: [number, number, number];
  size: [number, number, number];
}

// A simple, reusable panel component. It's just a mesh with a box geometry.
export function Panel({ position, size }: PanelProps) {
  return (
    <mesh position={position}>
      <boxGeometry args={size} />
      {/* The material will be defined on the parent so all panels match */}
    </mesh>
  );
}
