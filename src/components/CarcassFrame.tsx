"use client";

import { useShelfStore } from "@/lib/store";
import { Panel } from "./Panel";

export function CarcassFrame() {
  const { width, height, depth, panelThickness, numberOfColumns, columnWidths, rowCounts } =
    useShelfStore();

  const w = width / 100;
  const h = height / 100;
  const d = depth / 100;
  const t = panelThickness / 100;

  const innerWidth = w - 2 * t;
  const columnWidth = innerWidth / numberOfColumns;
  const numberOfDividers = numberOfColumns - 1;
  const totalColumnUnits = columnWidths.reduce((a, b) => a + b, 0);

  let dividerPositions: number[] = [];
  let acc = -innerWidth / 2;
  for (let i = 0; i < numberOfColumns - 1; i++) {
    acc += (columnWidths[i] / totalColumnUnits) * innerWidth;
    dividerPositions.push(acc);
  }

  const dividers = dividerPositions.map((xPos, i) => ({
    id: `divider-${i}`,
    position: [xPos, h / 2, 0] as [number, number, number],
    size: [t, h - 2 * t, d] as [number, number, number],
  }));

  // Calculate x positions for each compartment
  let x = -innerWidth / 2;
  const compartments = [];
  for (let i = 0; i < numberOfColumns; i++) {
    const colWidth = columnWidths[i] * (innerWidth / columnWidths.reduce((a, b) => a + b, 0));
    compartments.push({ xStart: x, xEnd: x + colWidth, width: colWidth });
    x += colWidth;
  }

  // Generate shelves for each compartment
  const shelves = compartments.flatMap((comp, i) => {
    const shelfCount = rowCounts?.[i] ?? 0; // Use 0 as default, not 1
    const shelfSpacing = (h - 2 * t) / (shelfCount + 1);
    return Array.from({ length: shelfCount }, (_, j) => ({
      key: `shelf-${i}-${j}`,
      position: [
        (comp.xStart + comp.xEnd) / 2,
        t + shelfSpacing * (j + 1),
        0,
      ] as [number, number, number],
      size: [comp.width, t, d] as [number, number, number],
    }));
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
      {/* Dynamic Horizontal Shelves */}
      {shelves.map(shelf => (
        <Panel
          key={shelf.key}
          position={shelf.position}
          size={shelf.size}
        />
      ))}
    </group>
  );
}
