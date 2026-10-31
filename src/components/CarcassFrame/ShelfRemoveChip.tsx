"use client";

import { Html } from "@react-three/drei";
import { Trash2 } from "lucide-react";
import { useState } from "react";
import { withDoorRemovalNotice } from "@/lib/door-removal-notice";
import { type ShelfState, useShelfStore } from "@/lib/store";

interface ShelfRemoveChipProps {
  /** Compartment directly below the shelf; removing the shelf merges it with the one above. */
  compartmentKey: string;
  shelfX: number;
  shelfWidth: number;
  y: number;
  /** Front face of the carcass */
  z: number;
}

export function ShelfRemoveChip({
  compartmentKey,
  shelfX,
  shelfWidth,
  y,
  z,
}: ShelfRemoveChipProps) {
  const [isHovered, setIsHovered] = useState(false);
  const removeShelf = withDoorRemovalNotice(
    useShelfStore((s: ShelfState) => s.removeShelfAboveCompartment),
  );

  return (
    <>
      {isHovered && (
        <mesh position={[shelfX, y, z + 0.006]} renderOrder={10}>
          <planeGeometry args={[shelfWidth, 0.03]} />
          <meshBasicMaterial
            color="#f38ba8"
            transparent
            opacity={0.6}
            depthTest={false}
          />
        </mesh>
      )}
      <Html
        position={[shelfX + shelfWidth / 2 - 0.07, y, z + 0.02]}
        center
        zIndexRange={[1, 10]}
      >
        <button
          type="button"
          aria-label="Ukloni policu"
          title="Ukloni policu"
          onClick={(e) => {
            e.stopPropagation();
            setIsHovered(false);
            removeShelf(compartmentKey);
          }}
          onMouseEnter={() => setIsHovered(true)}
          onMouseLeave={() => setIsHovered(false)}
          className="flex size-8 cursor-pointer items-center justify-center rounded-full border-2 border-[#f38ba8] bg-[#313244] shadow-[0_2px_8px_rgba(0,0,0,0.3)] transition-colors hover:bg-[#45475a] pointer-coarse:size-10"
        >
          <Trash2 size={16} color="#f38ba8" />
        </button>
      </Html>
    </>
  );
}
