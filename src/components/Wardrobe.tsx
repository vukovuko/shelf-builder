"use client";
import React from "react";
import { useShelfStore, type ShelfState } from "@/lib/store";
import CarcassFrame, { type CarcassFrameHandle } from "./CarcassFrame";
// import { InteriorBack } from "./InteriorBack";  // Temporarily removed for rebuild

const Wardrobe = React.forwardRef<CarcassFrameHandle, {}>(
  function Wardrobe(_, ref) {
    const materials = useShelfStore((state: ShelfState) => state.materials);

    return (
      <group>
        <CarcassFrame ref={ref} materials={materials} />
        {/* <InteriorBack /> */}
      </group>
    );
  },
);

export { Wardrobe };
