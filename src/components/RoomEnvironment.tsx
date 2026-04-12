"use client";

import { useTexture } from "@react-three/drei";
import { useShelfStore, type ShelfState } from "@/lib/store";
import * as THREE from "three";

export function RoomEnvironment() {
  const height = useShelfStore((s: ShelfState) => s.height);
  const depth = useShelfStore((s: ShelfState) => s.depth);

  const h = height / 100;
  const d = depth / 100;

  const wallTex = useTexture("/textures/wall.jpg");
  const floorTex = useTexture("/textures/parquet.jpg");

  wallTex.wrapS = wallTex.wrapT = THREE.RepeatWrapping;
  wallTex.repeat.set(12, 8);

  floorTex.wrapS = floorTex.wrapT = THREE.RepeatWrapping;
  floorTex.repeat.set(12, 12);

  const floorY = -h / 2;
  const wallZ = -d / 2 - 0.001;

  return (
    <group>
      {/* Wall — massive plane, no visible edges */}
      <mesh position={[0, floorY + 25, wallZ]} receiveShadow>
        <planeGeometry args={[50, 50]} />
        <meshStandardMaterial map={wallTex} roughness={0.9} metalness={0} />
      </mesh>

      {/* Floor — massive plane, no visible edges */}
      <mesh
        position={[0, floorY, 0]}
        rotation={[-Math.PI / 2, 0, 0]}
        receiveShadow
      >
        <planeGeometry args={[50, 50]} />
        <meshStandardMaterial map={floorTex} roughness={0.8} metalness={0} />
      </mesh>
    </group>
  );
}
