"use client";
import React from "react";
import { useShelfStore } from "@/lib/store";
import CarcassFrame, { type CarcassFrameHandle } from "./CarcassFrame";
import { InteriorBack } from "./InteriorBack";

const Wardrobe = React.forwardRef<CarcassFrameHandle, {}>(
  function Wardrobe(_, ref) {
    const materials = useShelfStore((state) => state.materials);

    return (
      <group>
        <CarcassFrame
          ref={ref}
          materials={materials.map((m) => ({
            id: String(m.id),
            thickness: m.thickness ?? undefined,
          }))}
        />
        <InteriorBack />
      </group>
    );
  },
);

export { Wardrobe };
