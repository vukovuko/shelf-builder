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
  wallTex.repeat.set(8, 3);

  floorTex.wrapS = floorTex.wrapT = THREE.RepeatWrapping;
  floorTex.repeat.set(10, 5);

  const wallW = 12;
  const wallH = 4;
  const floorW = 12;
  // Floor depth: only extends forward from the wall, not behind it
  const floorD = 6;

  const floorY = -h / 2;
  const wallZ = -d / 2 - 0.001;

  return (
    <group>
      {/* Wall */}
      <mesh position={[0, floorY + wallH / 2, wallZ]} receiveShadow>
        <planeGeometry args={[wallW, wallH]} />
        <meshStandardMaterial map={wallTex} roughness={0.9} metalness={0} />
      </mesh>

      {/* Floor — centered so back edge aligns with wall, extends forward only */}
      <mesh
        position={[0, floorY, wallZ + floorD / 2]}
        rotation={[-Math.PI / 2, 0, 0]}
        receiveShadow
      >
        <planeGeometry args={[floorW, floorD]} />
        <meshStandardMaterial map={floorTex} roughness={0.8} metalness={0} />
      </mesh>
    </group>
  );
}
