"use client";

import CarcassFrame from "./CarcassFrame";
import materials from "../data/materials.json";
import { InteriorBack } from "./InteriorBack";

export function Wardrobe() {
  return (
    <group>
      <CarcassFrame materials={materials.map(m => ({ ...m, id: String(m.id) }))} />
      <InteriorBack />
    </group>
  );
}
