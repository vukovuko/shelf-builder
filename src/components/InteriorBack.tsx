"use client";

import { Edges } from "@react-three/drei";
import { useShelfStore } from "@/lib/store";

export function InteriorBack() {
  const { width, height, depth, panelThickness } = useShelfStore();

  const w = width / 100;
  const h = height / 100;
  const d = depth / 100;
  const t = panelThickness / 100;

  // Key based on dimensions to force geometry/edges recreation
  const geoKey = `${w}-${h}-${d}-${t}`;

  // This back panel has a slightly darker color to create depth
  return (
    <mesh position={[0, 0, -d / 2 + t / 2]} receiveShadow>
      <boxGeometry key={geoKey} args={[w - 2 * t, h - 2 * t, t]} />
      <meshStandardMaterial color="#e5e5e5" />
      <Edges key={`e-${geoKey}`} scale={1.01} threshold={15} color="black" />
    </mesh>
  );
}
