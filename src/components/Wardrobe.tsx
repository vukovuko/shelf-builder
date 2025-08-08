
"use client";
import React from "react";

import CarcassFrame, { CarcassFrameHandle } from "./CarcassFrame";
import materials from "../data/materials.json";
import { InteriorBack } from "./InteriorBack";

const Wardrobe = React.forwardRef<CarcassFrameHandle, {}>(function Wardrobe(_, ref) {
  return (
    <group>
      <CarcassFrame ref={ref} materials={materials.map(m => ({ ...m, id: String(m.id) }))} />
      <InteriorBack />
    </group>
  );
});

export { Wardrobe };
 
