"use client";

import { CarcassFrame } from "./CarcassFrame";
import { InteriorBack } from "./InteriorBack";

export function Wardrobe() {
  return (
    <group>
      <CarcassFrame />
      <InteriorBack />
    </group>
  );
}
