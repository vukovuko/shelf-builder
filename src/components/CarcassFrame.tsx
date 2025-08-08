"use client";

import materials from "@/data/materials.json";
import { useShelfStore } from "@/lib/store";
import { Panel } from "./Panel";
import { Html } from "@react-three/drei";
import React, { useState } from "react";

export function CarcassFrame() {
  // All useState hooks FIRST!
  const [showShelfLabels, setShowShelfLabels] = useState<{ [key: string]: boolean }>({});
  const [showPanelLabels, setShowPanelLabels] = useState<{ [key: string]: boolean }>({});
  const [showDividerLabels, setShowDividerLabels] = useState<{ [key: string]: boolean }>({});
  const [draggedShelfKey, setDraggedShelfKey] = useState<string | null>(null);
  const [draggedDividerKey, setDraggedDividerKey] = useState<string | null>(null);
  const [dragOffset, setDragOffset] = useState<number>(0);
  const [initialShelfY, setInitialShelfY] = useState<number>(0);
  const [initialDividerX, setInitialDividerX] = useState<number>(0);
  const [customShelfPositions, setCustomShelfPositions] = useState<{ [key: string]: number }>({});
  const [customDividerPositions, setCustomDividerPositions] = useState<{ [key: string]: number }>({});

  const {
    width,
    height,
    depth,
    numberOfColumns,
    columnWidths,
    rowCounts,
    selectedMaterialId,
    showDimensions,
  } = useShelfStore();

  const cameraMode = useShelfStore(state => state.cameraMode);

  const material = materials.find(m => m.id === selectedMaterialId) || materials[0];
  const t = (material.thickness ?? 18000) / 1000; // <-- updated here

  const w = width / 100;
  const h = height / 100;
  const d = depth / 100;

  const color = material.color ?? "#ffffff";

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

  // Update divider positions to use customDividerPositions
  const dividers = dividerPositions.map((xPos, i) => {
    const customX = customDividerPositions[`divider-${i}`] ?? xPos;
    return {
      id: `divider-${i}`,
      position: [customX, h / 2, 0] as [number, number, number],
      size: [t, h - 2 * t, d] as [number, number, number],
    };
  });

  // Calculate x positions for each compartment
  const dividerXPositions = dividers.map(div => div.position[0]);
  const xPositions = [-innerWidth / 2, ...dividerXPositions, innerWidth / 2];

  const compartments = [];
  for (let i = 0; i < numberOfColumns; i++) {
    const xStart = xPositions[i];
    const xEnd = xPositions[i + 1];
    const width = xEnd - xStart;
    compartments.push({ xStart, xEnd, width });
  }

  // Generate shelves for each compartment
  const shelves = compartments.flatMap((comp, i) => {
    const shelfCount = rowCounts?.[i] ?? 0;
    const shelfSpacing = (h - 2 * t) / (shelfCount + 1);

    let shelfWidth: number;
    let shelfX: number;

    if (i === 0) {
      // First compartment: only right side touches a divider
      shelfWidth = comp.width - t / 2;
      shelfX = comp.xStart + shelfWidth / 2;
    } else if (i === compartments.length - 1) {
      // Last compartment: only left side touches a divider
      shelfWidth = comp.width - t / 2;
      shelfX = comp.xStart + t / 2 + shelfWidth / 2;
    } else {
      // Middle compartments: both sides touch dividers
      shelfWidth = comp.width - t;
      shelfX = comp.xStart + t / 2 + shelfWidth / 2;
    }

    return Array.from({ length: shelfCount }, (_, j) => ({
      key: `shelf-${i}-${j}`,
      position: [
        shelfX,
        t + shelfSpacing * (j + 1),
        0,
      ] as [number, number, number],
      size: [shelfWidth, t, d] as [number, number, number],
    }));
  });

  // Print only position and dimensions for each compartment
  compartments.forEach((comp, i) => {
    const position = [
      (comp.xStart + comp.xEnd) / 2,
      h / 2,
      0,
    ];
    const size = [comp.width, h - 2 * t, d];
    console.log(`Compartment ${i}: position=${JSON.stringify(position)}, size=${JSON.stringify(size)}`);
  });

  // Panel positions and sizes
  const panels = [
    {
      label: "Left Side",
      position: [-w / 2 + t/2, h / 2, 0],
      size: [t, h, d],
    },
    {
      label: "Right Side",
      position: [w / 2 - t / 2, h / 2, 0],
      size: [t, h, d],
    },
    {
      label: "Bottom",
      position: [0, t / 2, 0],
      size: [w - 2 * t, t, d],
    },
    {
      label: "Top",
      position: [0, h - t / 2, 0],
      size: [w - 2 * t, t, d],
    },
  ];

  React.useEffect(() => {
    function onMouseMove(e: MouseEvent) {
      if (draggedShelfKey) {
        const pixelToWorld = 0.01; // Adjust for your scene
        const newY = initialShelfY + (e.clientY - dragOffset) * -pixelToWorld;
        setCustomShelfPositions(pos => ({
          ...pos,
          [draggedShelfKey]: newY,
        }));
      }
      if (draggedDividerKey) {
        const pixelToWorld = 0.01; // Adjust for your scene
        const newX = initialDividerX + (e.clientX - dragOffset) * pixelToWorld;
        setCustomDividerPositions(pos => ({
          ...pos,
          [draggedDividerKey]: newX,
        }));
      }
    }
    function onMouseUp() {
      setDraggedShelfKey(null);
      setDraggedDividerKey(null);
      document.body.style.userSelect = "";
    }
    if (draggedShelfKey || draggedDividerKey) {
      window.addEventListener("mousemove", onMouseMove);
      window.addEventListener("mouseup", onMouseUp);
    }
    return () => {
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseup", onMouseUp);
    };
  }, [draggedShelfKey, draggedDividerKey, dragOffset, initialShelfY, initialDividerX]);

  return (
    <group>
      {/* This material applies ONLY to the frame parts */}
      <meshStandardMaterial color={color} />

      {/* Side, Top, and Bottom Panels with labels */}
      {panels.map((panel, i) => (
        <group key={panel.label}>
          <Panel position={panel.position} size={panel.size} />
          <Html
            position={[
              panel.position[0],
              panel.position[1] + 0.05,
              panel.position[2],
            ]}
            center
            distanceFactor={cameraMode === "3D" ? 4 : 8}
            style={{ pointerEvents: "auto" }}
          >
            <button
              style={{
                fontSize: "4px",
                padding: "2px 6px",
                borderRadius: "4px",
                border: "1px solid #888",
                background: "#fff",
                cursor: "pointer",
                marginBottom: "4px",
              }}
              onClick={e => {
                e.stopPropagation();
                setShowPanelLabels(prev => ({
                  ...prev,
                  [panel.label]: !prev[panel.label]
                }));
              }}
            >
              {showPanelLabels[panel.label] ? "Hide Info" : "Show Info"}
            </button>
            {showPanelLabels[panel.label] && (
              <div
                style={{
                  background: "rgba(255,255,255,0.85)",
                  padding: "2px 6px",
                  borderRadius: "4px",
                  fontSize: "4px",
                  color: "#222",
                  border: "1px solid #ccc",
                  marginTop: "2px",
                  whiteSpace: "pre",
                }}
              >
                {`${panel.label}
pos: [${panel.position.map(n => n.toFixed(3)).join(", ")}]
size: [${panel.size.map(n => n.toFixed(3)).join(", ")}]`}
              </div>
            )}
          </Html>
        </group>
      ))}

      {/* Dynamic Vertical Dividers with button */}
      {dividers.map((divider, i) => (
        <group key={divider.id}>
          <Panel position={divider.position} size={divider.size} />
          <Html
            position={[
              (customDividerPositions[divider.id] ?? divider.position[0]),
              divider.position[1],
              divider.position[2] + divider.size[2] / 2,
            ]}
            center
            distanceFactor={8}
            style={{ pointerEvents: "auto" }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
              {/* Show Info Button */}
              <button
                style={{
                  fontSize: "4px",
                  padding: "2px 6px",
                  borderRadius: "4px",
                  border: "1px solid #888",
                  background: "#fff",
                  cursor: "pointer",
                  marginBottom: "4px",
                }}
                onClick={e => {
                  e.stopPropagation();
                  setShowDividerLabels(prev => ({
                    ...prev,
                    [divider.id]: !prev[divider.id]
                  }));
                }}
              >
                {showDividerLabels[divider.id] ? "Hide Info" : "Show Info"}
              </button>
              {/* Drag Button */}
              <button
                style={{
                  width: 20,
                  height: 20,
                  borderRadius: "50%",
                  border: "1px solid #888",
                  background: draggedDividerKey === divider.id ? "#eee" : "#fff",
                  cursor: draggedDividerKey === divider.id ? "grabbing" : "grab",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  marginBottom: "4px",
                }}
                onMouseDown={e => {
                  e.stopPropagation();
                  setDraggedDividerKey(divider.id);
                  setDragOffset(e.clientX);
                  setInitialDividerX(customDividerPositions[divider.id] ?? divider.position[0]);
                  document.body.style.userSelect = "none";
                }}
              >
                <img
                  src="/up-down-arrow-icon.png"
                  alt="Drag Divider"
                  style={{ width: 14, height: 14, pointerEvents: "none" }}
                />
              </button>
            </div>
            {showDividerLabels[divider.id] && (
              <div
                style={{
                  background: "rgba(255,255,255,0.85)",
                  padding: "2px 6px",
                  borderRadius: "4px",
                  fontSize: "4px",
                  color: "#222",
                  border: "1px solid #ccc",
                  marginTop: "2px",
                  whiteSpace: "pre",
                }}
              >
                {`Divider ${i + 1}
pos: [${divider.position.map(n => n.toFixed(3)).join(", ")}]
size: [${divider.size.map(n => n.toFixed(3)).join(", ")}]`}
              </div>
            )}
          </Html>
        </group>
      ))}

      {/* Compartment labels */}
      {compartments.map((comp, i) => {
        const position = [
          (comp.xStart + comp.xEnd) / 2,
          h / 2,
          0.05
        ];
        const size = [comp.width, h - 2 * t, d];
        return showDimensions && (
          <Html
            key={`comp-label-${i}`}
            position={position}
            center
            distanceFactor={8}
            style={{
              background: "rgba(255,255,255,0.85)",
              padding: "4px 8px",
              borderRadius: "4px",
              fontSize: "4px",
              pointerEvents: "none",
              whiteSpace: "pre",
              color: "#222",
              border: "1px solid #ccc"
            }}
          >
            {`Compartment ${i + 1}
pos: [${position.map(n => n.toFixed(2)).join(", ")}]
size: [${size.map(n => n.toFixed(2)).join(", ")}]`}
          </Html>
        );
      })}

      {/* Dynamic Horizontal Shelves with button */}
      {shelves.map((shelf, i) => (
        <group key={shelf.key}>
          <Panel
            position={[
              shelf.position[0],
              customShelfPositions[shelf.key] ?? shelf.position[1],
              shelf.position[2]
            ]}
            size={shelf.size}
          />
          <Html
            position={[
              shelf.position[0],
              (customShelfPositions[shelf.key] ?? shelf.position[1]) + 0.03,
              shelf.position[2] + shelf.size[2] / 2,
            ]}
            center
            distanceFactor={8}
            style={{ pointerEvents: "auto" }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
              {/* Show Info Button
              <button
                style={{
                  fontSize: "4px",
                  padding: "2px 6px",
                  borderRadius: "4px",
                  border: "1px solid #888",
                  background: "#fff",
                  cursor: "pointer",
                  marginBottom: "4px",
                }}
                onClick={e => {
                  e.stopPropagation();
                  setShowShelfLabels(prev => ({
                    ...prev,
                    [shelf.key]: !prev[shelf.key]
                  }));
                }}
              >
                {showShelfLabels[shelf.key] ? "Hide Info" : "Show Info"}
              </button>
              {/* Drag Button */}
              <button
                style={{
                  width: 20,
                  height: 20,
                  borderRadius: "50%",
                  border: "1px solid #888",
                  background: draggedShelfKey === shelf.key ? "#eee" : "#fff",
                  cursor: draggedShelfKey === shelf.key ? "grabbing" : "grab",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  marginBottom: "4px",
                }}
                onMouseDown={e => {
                  e.stopPropagation();
                  setDraggedShelfKey(shelf.key);
                  setDragOffset(e.clientY);
                  setInitialShelfY(customShelfPositions[shelf.key] ?? shelf.position[1]);
                  document.body.style.userSelect = "none";
                }}
              >
                <img
                  src="/up-down-arrow-icon.png"
                  alt="Drag Shelf"
                  style={{ width: 14, height: 14, pointerEvents: "none" }}
                />
              </button>
            </div>
            {showShelfLabels[shelf.key] && (
              <div
                style={{
                  background: "rgba(255,255,255,0.85)",
                  padding: "2px 6px",
                  borderRadius: "4px",
                  fontSize: "4px",
                  color: "#222",
                  border: "1px solid #ccc",
                  marginTop: "2px",
                  whiteSpace: "pre",
                }}
              >
                {`Shelf
pos: [${shelf.position.map(n => n.toFixed(3)).join(", ")}]
size: [${shelf.size.map(n => n.toFixed(3)).join(", ")}]`}
              </div>
            )}
          </Html>
        </group>
      ))}
    </group>
  );
}
