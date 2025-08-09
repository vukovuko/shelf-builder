"use client";
import React from "react";
import { useShelfStore } from "../lib/store";
import { Panel } from "./Panel";
import { Html } from "@react-three/drei";

type Material = {
  id: string;
  color?: string;
  thickness?: number;
};

interface CarcassFrameProps {
  materials: Material[];
}

export type CarcassFrameHandle = {
  toggleAllInfo: (show: boolean) => void;
};

const CarcassFrame = React.forwardRef<CarcassFrameHandle, CarcassFrameProps>(
  function CarcassFrame({ materials }, ref) {
    // State for drag and info overlays
    const [customDividerPositions, setCustomDividerPositions] = React.useState<Record<string, number>>({});
    const [customShelfPositions, setCustomShelfPositions] = React.useState<Record<string, number>>({});
    const [draggedShelfKey, setDraggedShelfKey] = React.useState<string | null>(null);
    const [draggedDividerKey, setDraggedDividerKey] = React.useState<string | null>(null);
    const [dragOffset, setDragOffset] = React.useState<number>(0);
    const [initialShelfY, setInitialShelfY] = React.useState<number>(0);
    const [initialDividerX, setInitialDividerX] = React.useState<number>(0);
    const [showPanelLabels, setShowPanelLabels] = React.useState<Record<string, boolean>>({});
    const [showDividerLabels, setShowDividerLabels] = React.useState<Record<string, boolean>>({});
    const [showShelfLabels, setShowShelfLabels] = React.useState<Record<string, boolean>>({});

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

    const cameraMode = useShelfStore((state) => state.cameraMode);
    const elementConfigs = useShelfStore((state) => state.elementConfigs);
    const hasBase = useShelfStore((state) => state.hasBase);
    const baseHeightCm = useShelfStore((state) => state.baseHeight);
    const baseH = (hasBase ? baseHeightCm : 0) / 100;

    const material =
      materials.find((m: Material) => String(m.id) === String(selectedMaterialId)) ||
      materials[0];
    const t = (material.thickness ?? 18000) / 1000;

    const w = width / 100;
    const h = height / 100;
    const d = depth / 100;

    const color = material.color ?? "#ffffff";

    const innerWidth = w - 2 * t;
    const columnWidth = innerWidth / numberOfColumns;
    const numberOfDividers = numberOfColumns - 1;
    const totalColumnUnits = columnWidths.reduce((a, b) => a + b, 0);

    // Build divider positions (skip the center seam when width > 100)
    let dividerPositions: number[] = [];
    {
      let acc = -innerWidth / 2;
      for (let i = 0; i < numberOfColumns - 1; i++) {
        acc += (columnWidths[i] / totalColumnUnits) * innerWidth;
        if (width > 100 && numberOfColumns % 2 === 0 && i === numberOfColumns / 2 - 1) {
          continue;
        }
        dividerPositions.push(acc);
      }
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
    const dividerXPositions = dividers.map((div) => div.position[0]);
    const xPositions = [-innerWidth / 2, ...dividerXPositions, innerWidth / 2];

    const compartments: { xStart: number; xEnd: number; width: number }[] = [];
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
        shelfWidth = comp.width - t / 2;
        shelfX = comp.xStart + shelfWidth / 2;
      } else if (i === compartments.length - 1) {
        shelfWidth = comp.width - t / 2;
        shelfX = comp.xStart + t / 2 + shelfWidth / 2;
      } else {
        shelfWidth = comp.width - t;
        shelfX = comp.xStart + t / 2 + shelfWidth / 2;
      }

      return Array.from({ length: shelfCount }, (_, j) => ({
        key: `shelf-${i}-${j}`,
        position: [shelfX, t + shelfSpacing * (j + 1), 0] as [number, number, number],
        size: [shelfWidth, t, d] as [number, number, number],
      }));
    });

    // Panel positions and sizes: split horizontally (X) into equal blocks and vertically (Y) into modules
    const panels = React.useMemo(() => {
      type PanelDef = { label: string; position: [number, number, number]; size: [number, number, number] };
      const list: PanelDef[] = [];

      // X blocks: equalize external width, max 100cm per block
      const maxSegX = 100 / 100; // 1.0 world units
      const nBlocksX = Math.max(1, Math.ceil(w / maxSegX));
      const segWX = w / nBlocksX;
      const blocksX = Array.from({ length: nBlocksX }, (_, i) => {
        const start = -w / 2 + i * segWX;
        const end = start + segWX;
        return { start, end, width: segWX };
      });
      const boundariesX = Array.from({ length: nBlocksX + 1 }, (_, i) => -w / 2 + i * segWX);

      // Y modules: split if height > 200cm. Bottom is 200cm only if total > 210cm; otherwise shrink bottom so top is at least 10cm
      const targetBottomH = 200 / 100; // 2.0 world units
      const minTopH = 10 / 100; // 0.1 world units
      const modulesY: { yStart: number; yEnd: number; height: number; label: string }[] = [];
      if (h > 200 / 100) {
        const yStartBottom = -h / 2;
        // Ensure top >= 10cm: if remaining height < 10cm, shrink bottom accordingly
        const bottomH = (h - targetBottomH) < minTopH ? (h - minTopH) : targetBottomH;
        const yEndBottom = yStartBottom + bottomH;
        const yStartTop = yEndBottom;
        const yEndTop = h / 2;
        modulesY.push({ yStart: yStartBottom, yEnd: yEndBottom, height: bottomH, label: "BottomModule" });
        modulesY.push({ yStart: yStartTop, yEnd: yEndTop, height: yEndTop - yStartTop, label: "TopModule" });
      } else {
        modulesY.push({ yStart: -h / 2, yEnd: h / 2, height: h, label: "SingleModule" });
      }

      // Side panels at each X boundary, per Y module
      boundariesX.forEach((x, idx) => {
        modulesY.forEach((m) => {
          const cy = (m.yStart + m.yEnd) / 2;
          if (idx === 0) {
            list.push({ label: `Side L (${m.label})`, position: [x + t / 2, cy, 0], size: [t, m.height, d] });
          } else if (idx === boundariesX.length - 1) {
            list.push({ label: `Side R (${m.label})`, position: [x - t / 2, cy, 0], size: [t, m.height, d] });
          } else {
            // Internal seam: two touching panels
            list.push({ label: `Side seam ${idx}A (${m.label})`, position: [x - t / 2, cy, 0], size: [t, m.height, d] });
            list.push({ label: `Side seam ${idx}B (${m.label})`, position: [x + t / 2, cy, 0], size: [t, m.height, d] });
          }
        });
      });

      // Top and Bottom panels per X block and Y module
      blocksX.forEach((bx, i) => {
        modulesY.forEach((m) => {
          const innerLenX = Math.max(segWX - 2 * t, 0.001);
          const cx = (bx.start + bx.end) / 2;
          const raise = hasBase && (m.label === "BottomModule" || m.label === "SingleModule") ? baseH : 0;
          const yBottom = m.yStart + raise + t / 2;
          const yTop = m.yEnd - t / 2;
          list.push({ label: `Bottom ${i + 1} (${m.label})`, position: [cx, yBottom, 0], size: [innerLenX, t, d] });
          list.push({ label: `Top ${i + 1} (${m.label})`, position: [cx, yTop, 0], size: [innerLenX, t, d] });
        });
      });

      return list;
    }, [w, h, t, d, width, hasBase, baseH]);

    // Element letter labels (A, B, C, ...) at each element's center on the back side
    const elementLabels = React.useMemo(() => {
      // Helper to map index -> A, B, ..., Z, AA, AB, ...
      const toLetters = (num: number) => {
        let n = num + 1; // 1-based
        let s = "";
        while (n > 0) {
          const rem = (n - 1) % 26;
          s = String.fromCharCode(65 + rem) + s;
          n = Math.floor((n - 1) / 26);
        }
        return s;
      };

      // Recompute blocks and modules to get their centers (keep logic in sync with panels)
      const maxSegX = 100 / 100;
      const nBlocksX = Math.max(1, Math.ceil(w / maxSegX));
      const segWX = w / nBlocksX;
      const blocksX = Array.from({ length: nBlocksX }, (_, i) => {
        const start = -w / 2 + i * segWX;
        const end = start + segWX;
        return { start, end };
      });

      const targetBottomH = 200 / 100;
      const minTopH = 10 / 100;
      const modulesY: { yStart: number; yEnd: number }[] = [];
      if (h > 200 / 100) {
        const yStartBottom = -h / 2;
        const bottomH = (h - targetBottomH) < minTopH ? (h - minTopH) : targetBottomH;
        const yEndBottom = yStartBottom + bottomH;
        const yStartTop = yEndBottom;
        const yEndTop = h / 2;
        modulesY.push({ yStart: yStartBottom, yEnd: yEndBottom });
        modulesY.push({ yStart: yStartTop, yEnd: yEndTop });
      } else {
        modulesY.push({ yStart: -h / 2, yEnd: h / 2 });
      }

      const labels: { key: string; position: [number, number, number]; letter: string }[] = [];
      let idx = 0;
      // Order: bottom-to-top, left-to-right
      modulesY.forEach((m, mIdx) => {
        const cy = (m.yStart + m.yEnd) / 2;
        blocksX.forEach((bx, bIdx) => {
          const cx = (bx.start + bx.end) / 2;
          const cz = -d / 2 + t + 0.001; // slightly in front of the back panel
          labels.push({ key: `elem-${mIdx}-${bIdx}`, position: [cx, cy, cz], letter: toLetters(idx) });
          idx += 1;
        });
      });
      return labels;
    }, [w, h, d, t]);

    // Per-element dividers and shelves based on elementConfigs
    const elementStructures = React.useMemo(() => {
      // Helper
      const toLetters = (num: number) => {
        let n = num + 1;
        let s = "";
        while (n > 0) {
          const rem = (n - 1) % 26;
          s = String.fromCharCode(65 + rem) + s;
          n = Math.floor((n - 1) / 26);
        }
        return s;
      };

      // Blocks X
      const maxSegX = 100 / 100;
      const nBlocksX = Math.max(1, Math.ceil(w / maxSegX));
      const segWX = w / nBlocksX;
      const blocksX = Array.from({ length: nBlocksX }, (_, i) => {
        const start = -w / 2 + i * segWX;
        const end = start + segWX;
        return { start, end };
      });

      // Modules Y
      const targetBottomH = 200 / 100;
      const minTopH = 10 / 100;
      const modulesY: { yStart: number; yEnd: number }[] = [];
      if (h > 200 / 100) {
        const yStartBottom = -h / 2;
        const bottomH = (h - targetBottomH) < minTopH ? (h - minTopH) : targetBottomH;
        const yEndBottom = yStartBottom + bottomH;
        const yStartTop = yEndBottom;
        const yEndTop = h / 2;
        modulesY.push({ yStart: yStartBottom, yEnd: yEndBottom });
        modulesY.push({ yStart: yStartTop, yEnd: yEndTop });
      } else {
        modulesY.push({ yStart: -h / 2, yEnd: h / 2 });
      }

      type MeshDef = { key: string; position: [number, number, number]; size: [number, number, number] };
      const divs: MeshDef[] = [];
      const shs: MeshDef[] = [];

      let idx = 0;
      modulesY.forEach((m, mIdx) => {
        const yStartInner = m.yStart + t;
        const yEndInner = m.yEnd - t;
        const innerH = Math.max(yEndInner - yStartInner, 0);
        const cy = (yStartInner + yEndInner) / 2;
        blocksX.forEach((bx, bIdx) => {
          // Each element has its own side panels at its left and right boundary, so subtract thickness on both sides
          const xStartInner = bx.start + t;
          const xEndInner = bx.end - t;
          const innerW = Math.max(xEndInner - xStartInner, 0);
          const letter = toLetters(idx);
          const cfg = elementConfigs[letter] ?? { columns: 1, rowCounts: [0] };
          const cols = Math.max(1, cfg.columns | 0);
          // Dividers
          for (let c = 1; c <= cols - 1; c++) {
            const x = xStartInner + (innerW * c) / cols;
            divs.push({ key: `elem-${mIdx}-${bIdx}-div-${c}`, position: [x, cy, 0], size: [t, innerH, d] });
          }
          // Shelves
          const xs: number[] = [xStartInner];
          for (let c = 1; c <= cols - 1; c++) xs.push(xStartInner + (innerW * c) / cols);
          xs.push(xEndInner);
          for (let comp = 0; comp < cols; comp++) {
            const x0 = xs[comp];
            const x1 = xs[comp + 1];
            // Trim by t/2 when adjacent to internal dividers so shelves butt against faces, not centers
            const left = x0 + (comp === 0 ? 0 : t / 2);
            const right = x1 - (comp === cols - 1 ? 0 : t / 2);
            const compW = Math.max(right - left, 0);
            const shelfCount = cfg.rowCounts?.[comp] ?? 0;
            if (shelfCount <= 0) continue;
            const spacing = innerH / (shelfCount + 1);
            for (let s = 0; s < shelfCount; s++) {
              const y = yStartInner + spacing * (s + 1);
              // Make shelves exactly touch inner faces (and divider faces)
              shs.push({ key: `elem-${mIdx}-${bIdx}-comp-${comp}-shelf-${s}`, position: [(left + right) / 2, y, 0], size: [compW, t, d] });
            }
          }
          idx += 1;
        });
      });
      return { dividers: divs, shelves: shs };
    }, [w, h, t, d, elementConfigs]);

    React.useEffect(() => {
      function onMouseMove(e: MouseEvent) {
        if (draggedShelfKey) {
          const pixelToWorld = 0.01;
          let newY = initialShelfY + (e.clientY - dragOffset) * -pixelToWorld;

          const shelfMatch = draggedShelfKey.match(/^shelf-(\d+)-(\d+)$/);
          if (shelfMatch) {
            const compIdx = parseInt(shelfMatch[1], 10);
            const shelfIdx = parseInt(shelfMatch[2], 10);
            const shelvesInComp = shelves.filter((s) => s.key.startsWith(`shelf-${compIdx}-`));
            const sortedShelves = shelvesInComp
              .map((s) => ({
                ...s,
                y: customShelfPositions[s.key] ?? s.position[1],
              }))
              .sort((a, b) => a.y - b.y);
            const idx = sortedShelves.findIndex((s) => s.key === draggedShelfKey);
            const minGap = 10 / 100;
            const yAbove = idx > 0 ? sortedShelves[idx - 1].y : t;
            const yBelow = idx < sortedShelves.length - 1 ? sortedShelves[idx + 1].y : h - t;
            const minY = yAbove + minGap;
            const maxY = yBelow - minGap;
            newY = Math.max(minY, Math.min(newY, maxY));
          }

          setCustomShelfPositions((pos) => ({
            ...pos,
            [draggedShelfKey!]: newY,
          }));
        }
        if (draggedDividerKey) {
          const pixelToWorld = 0.01;
          let newX = initialDividerX + (e.clientX - dragOffset) * pixelToWorld;

          const dividerIndex = dividers.findIndex((div) => div.id === draggedDividerKey);
          const prevX =
            dividerIndex === 0
              ? -innerWidth / 2
              : customDividerPositions[`divider-${dividerIndex - 1}`] ?? dividers[dividerIndex - 1].position[0];
          const nextX =
            dividerIndex === dividers.length - 1
              ? innerWidth / 2
              : customDividerPositions[`divider-${dividerIndex + 1}`] ?? dividers[dividerIndex + 1].position[0];
          const minGap = 10 / 100;
          const minX = prevX + minGap;
          const maxX = nextX - minGap;
          newX = Math.max(minX, Math.min(newX, maxX));

          setCustomDividerPositions((pos) => ({
            ...pos,
            [draggedDividerKey!]: newX,
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
    }, [draggedShelfKey, draggedDividerKey, dragOffset, initialShelfY, initialDividerX, innerWidth, h, t, dividers, customDividerPositions, customShelfPositions, setCustomDividerPositions]);

    // Handler to show/hide all shelf and divider info overlays (to be called from parent)
    const toggleAllInfo = (show: boolean) => {
      setShowShelfLabels(
        shelves.reduce((acc, shelf) => {
          acc[shelf.key] = show;
          return acc;
        }, {} as Record<string, boolean>)
      );
      setShowDividerLabels(
        dividers.reduce((acc, divider) => {
          acc[divider.id] = show;
          return acc;
        }, {} as Record<string, boolean>)
      );
      // Do NOT touch panel overlays
    };

    // Expose the handler for parent via ref
    React.useImperativeHandle(ref, () => ({ toggleAllInfo }), [shelves, dividers]);

    return (
      <group>
        {/* This material applies ONLY to the frame parts */}
        <meshStandardMaterial color={color} />

        {/* Side, Top, and Bottom Panels with labels */}
        {panels.map((panel) => (
          <group key={panel.label}>
            <Panel position={panel.position} size={panel.size} />
            <Html
              position={[panel.position[0], panel.position[1] + 0.05, panel.position[2]]}
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
                onClick={(e) => {
                  e.stopPropagation();
                  setShowPanelLabels((prev) => ({
                    ...prev,
                    [panel.label]: !prev[panel.label],
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
                  <>
                    {panel.label}
                    <br />
                    pos: [{(panel.position as number[]).map((n: number) => n.toFixed(3)).join(", ")}]
                    <br />
                    size: [{(panel.size as number[]).map((n: number) => n.toFixed(3)).join(", ")}]
                  </>
                </div>
              )}
            </Html>
          </group>
        ))}

        {/* Element letter markers on the back side */}
        {elementLabels.map((el) => (
          <Html
            key={el.key}
            position={el.position}
            center
            distanceFactor={cameraMode === "3D" ? 4 : 8}
            style={{
              pointerEvents: "none",
              background: "rgba(255,255,255,0.85)",
              padding: "2px 4px",
              borderRadius: "3px",
              fontSize: "8px",
              color: "#000",
              border: "1px solid #ccc",
              fontWeight: 600,
            }}
          >
            {el.letter}
          </Html>
        ))}

        {/* Element-based structure if configured */}
        {Object.keys(elementConfigs).length > 0 ? (
          <>
            {elementStructures.dividers.map((div) => (
              <Panel key={div.key} position={div.position} size={div.size} />
            ))}
            {elementStructures.shelves.map((sh) => (
              <Panel key={sh.key} position={sh.position} size={sh.size} />
            ))}
          </>
        ) : (
          <>
            {/* Dynamic Vertical Dividers with button */}
            {dividers.map((divider, i) => (
              <group key={divider.id}>
                <Panel position={divider.position} size={divider.size} />
                <Html
                  position={[
                    customDividerPositions[divider.id] ?? divider.position[0],
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
                      onClick={(e) => {
                        e.stopPropagation();
                        setShowDividerLabels((prev) => ({
                          ...prev,
                          [divider.id]: !prev[divider.id],
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
                      onMouseDown={(e) => {
                        e.stopPropagation();
                        setDraggedDividerKey(divider.id);
                        setDragOffset(e.clientX);
                        setInitialDividerX(customDividerPositions[divider.id] ?? divider.position[0]);
                        document.body.style.userSelect = "none";
                      }}
                    >
                      <img src="/up-down-arrow-icon.png" alt="Drag Divider" style={{ width: 14, height: 14, pointerEvents: "none" }} />
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
                      <>
                        Divider {i + 1}
                        <br />
                        pos: [{(divider.position as number[]).map((n: number) => n.toFixed(3)).join(", ")}]
                        <br />
                        size: [{(divider.size as number[]).map((n: number) => n.toFixed(3)).join(", ")}]
                      </>
                    </div>
                  )}
                </Html>
              </group>
            ))}

            {/* Dynamic Horizontal Shelves with button */}
            {shelves.map((shelf) => (
              <group key={shelf.key}>
                <Panel
                  position={[shelf.position[0], customShelfPositions[shelf.key] ?? shelf.position[1], shelf.position[2]]}
                  size={shelf.size}
                />
                <Html
                  position={[shelf.position[0], (customShelfPositions[shelf.key] ?? shelf.position[1]) + 0.03, shelf.position[2] + shelf.size[2] / 2]}
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
                      onClick={(e) => {
                        e.stopPropagation();
                        setShowShelfLabels((prev) => ({
                          ...prev,
                          [shelf.key]: !prev[shelf.key],
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
                      onMouseDown={(e) => {
                        e.stopPropagation();
                        setDraggedShelfKey(shelf.key);
                        setDragOffset(e.clientY);
                        setInitialShelfY(customShelfPositions[shelf.key] ?? shelf.position[1]);
                        document.body.style.userSelect = "none";
                      }}
                    >
                      <img src="/up-down-arrow-icon.png" alt="Drag Shelf" style={{ width: 14, height: 14, pointerEvents: "none" }} />
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
                      {`Shelf\npos: [${shelf.position.map((n) => n.toFixed(3)).join(", ")}]\nsize: [${shelf.size.map((n) => n.toFixed(3)).join(", ")} ]`}
                    </div>
                  )}
                </Html>
              </group>
            ))}
          </>
        )}

        {/* Compartment labels */}
        {compartments.map((comp, i) => {
          const position = [(comp.xStart + comp.xEnd) / 2, h / 2, 0.05] as [number, number, number];
          const size = [comp.width, h - 2 * t, d];
          return (
            showDimensions && (
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
                  border: "1px solid #ccc",
                }}
              >
                {`Compartment ${i + 1}\npos: [${position.map((n) => n.toFixed(2)).join(", ")}]\nsize: [${size.map((n) => n.toFixed(2)).join(", ")}]`}
              </Html>
            )
          );
        })}
      </group>
    );
  }
);

export default CarcassFrame;
