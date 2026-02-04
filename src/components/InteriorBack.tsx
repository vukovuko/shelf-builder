"use client";

import { Edges } from "@react-three/drei";
import { useShelfStore } from "@/lib/store";

export function InteriorBack() {
  const { width, height, depth, panelThickness } = useShelfStore();

  const w = width / 100;
  const h = height / 100;
  const d = depth / 100;
  const t = panelThickness / 100;

  // Clamp to safe minimums to prevent division by zero in shader
  const safeW = Math.max(0.02, w - 2 * t);
  const safeH = Math.max(0.02, h - 2 * t);

  // Key based on dimensions to force geometry/edges recreation
  const geoKey = `${safeW}-${safeH}-${d}-${t}`;

  // This back panel has a slightly darker color to create depth
  return (
    <mesh position={[0, 0, -d / 2 + t / 2]} receiveShadow>
      <boxGeometry key={geoKey} args={[safeW, safeH, t]} />
      <meshStandardMaterial color="#e5e5e5" />
      <Edges key={`e-${geoKey}`} scale={1.01} threshold={15} color="black" />
    </mesh>
  );
}
