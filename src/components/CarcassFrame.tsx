"use client";

import { useShelfStore } from "@/lib/store";
import { Panel } from "./Panel";

export function CarcassFrame() {
  const { width, height, depth, panelThickness, numberOfColumns } =
    useShelfStore();

  const w = width / 100;
  const h = height / 100;
  const d = depth / 100;
  const t = panelThickness / 100;

  const innerWidth = w - 2 * t;
  const columnWidth = innerWidth / numberOfColumns;
  const numberOfDividers = numberOfColumns - 1;

  const dividers = Array.from({ length: numberOfDividers }, (_, i) => {
    const xPos = -innerWidth / 2 + columnWidth * (i + 1);
    return {
      id: `divider-${i}`,
      position: [xPos, h / 2, 0] as [number, number, number],
      size: [t, h - 2 * t, d] as [number, number, number],
    };
  });

  return (
    <group>
      {/* This material applies ONLY to the frame parts */}
      <meshStandardMaterial color="#ffffff" />

      {/* Side, Top, and Bottom Panels */}
      <Panel position={[-w / 2 + t / 2, h / 2, 0]} size={[t, h, d]} />
      <Panel position={[w / 2 - t / 2, h / 2, 0]} size={[t, h, d]} />
      <Panel position={[0, t / 2, 0]} size={[w - 2 * t, t, d]} />
      <Panel position={[0, h - t / 2, 0]} size={[w - 2 * t, t, d]} />

      {/* Dynamic Vertical Dividers */}
      {dividers.map(divider => (
        <Panel
          key={divider.id}
          position={divider.position}
          size={divider.size}
        />
      ))}
    </group>
  );
}
