"use client";
import React from "react";
import materials from "../data/materials.json";
import CarcassFrame, { type CarcassFrameHandle } from "./CarcassFrame";
import { InteriorBack } from "./InteriorBack";

const Wardrobe = React.forwardRef<CarcassFrameHandle, {}>(
  function Wardrobe(_, ref) {
    return (
      <group>
        <CarcassFrame
          ref={ref}
          materials={materials.map((m) => ({ ...m, id: String(m.id) }))}
        />
        <InteriorBack />
      </group>
    );
  },
);

export { Wardrobe };
