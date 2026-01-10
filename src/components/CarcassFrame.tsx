"use client";
import { Html, Text } from "@react-three/drei";
import React from "react";
import * as THREE from "three";
import { useShelfStore } from "../lib/store";
import { Panel } from "./Panel";

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
    const [customDividerPositions, setCustomDividerPositions] = React.useState<
      Record<string, number>
    >({});
    const [customShelfPositions, setCustomShelfPositions] = React.useState<
      Record<string, number>
    >({});
    const [draggedShelfKey, setDraggedShelfKey] = React.useState<string | null>(
      null,
    );
    const [draggedDividerKey, setDraggedDividerKey] = React.useState<
      string | null
    >(null);
    const [dragOffset, setDragOffset] = React.useState<number>(0);
    const [initialShelfY, setInitialShelfY] = React.useState<number>(0);
    const [initialDividerX, setInitialDividerX] = React.useState<number>(0);
    const [showPanelLabels, setShowPanelLabels] = React.useState<
      Record<string, boolean>
    >({});
    const [showDividerLabels, setShowDividerLabels] = React.useState<
      Record<string, boolean>
    >({});
    const [showShelfLabels, setShowShelfLabels] = React.useState<
      Record<string, boolean>
    >({});

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

    const viewMode = useShelfStore((state) => state.viewMode);
    // For backward compatibility with existing 3D/2D logic
    const cameraMode = viewMode === "Sizing" ? "2D" : viewMode;
    const elementConfigs = useShelfStore((state) => state.elementConfigs);
    const showEdgesOnly = useShelfStore((state) => state.showEdgesOnly);
    const hasBase = useShelfStore((state) => state.hasBase);
    const baseHeightCm = useShelfStore((state) => state.baseHeight);
    const baseH = (hasBase ? baseHeightCm : 0) / 100;
    const _extrasMode = useShelfStore((s) => s.extrasMode);
    const _selectedCompartmentKey = useShelfStore(
      (s) => s.selectedCompartmentKey,
    );
    const _setSelectedCompartmentKey = useShelfStore(
      (s) => s.setSelectedCompartmentKey,
    );
    const compartmentExtras = useShelfStore((s) => s.compartmentExtras);
    const doorSelections = useShelfStore((s) => s.doorSelections);

    const material =
      materials.find(
        (m: Material) => String(m.id) === String(selectedMaterialId),
      ) || materials[0];
    const t = (material.thickness ?? 18000) / 1000;

    const w = width / 100;
    const h = height / 100;
    // Back material (5mm) lookup (optional, fallback to any material with thickness 5mm)
    const selectedBackMaterialId = useShelfStore(
      (s) => s.selectedBackMaterialId as any,
    );
    const backMat =
      materials.find(
        (m: Material) =>
          (selectedBackMaterialId &&
            String(m.id) === String(selectedBackMaterialId)) ||
          m.thickness === 5,
      ) || materials.find((m: Material) => m.thickness === 5);
    const backT = ((backMat?.thickness ?? 5) as number) / 1000;

    const D = depth / 100; // total depth selected by user (including back panel)
    const d = Math.max(D - backT, 0); // carcass effective depth (excluding back)

    const color = material.color ?? "#ffffff";

    const innerWidth = w - 2 * t;
    const _columnWidth = innerWidth / numberOfColumns;
    const _numberOfDividers = numberOfColumns - 1;
    const totalColumnUnits = columnWidths.reduce((a, b) => a + b, 0);

    // Build divider positions (skip the center seam when width > 100)
    const dividerPositions: number[] = [];
    {
      let acc = -innerWidth / 2;
      for (let i = 0; i < numberOfColumns - 1; i++) {
        acc += (columnWidths[i] / totalColumnUnits) * innerWidth;
        if (
          width > 100 &&
          numberOfColumns % 2 === 0 &&
          i === numberOfColumns / 2 - 1
        ) {
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

    // Map compartments to element keys (A, B, C...)
    const compartments: {
      xStart: number;
      xEnd: number;
      yStart: number;
      yEnd: number;
      width: number;
      elementKey: string;
    }[] = [];
    // Support both single and split modules (bottom-to-top, left-to-right)
    {
      const maxSegX = 100 / 100;
      const _nBlocksX = Math.max(1, Math.ceil(w / maxSegX));
      // Y modules: split if height > 200cm
      const modulesY: { yStart: number; yEnd: number }[] = [];
      if (h > 200 / 100) {
        const yStartBottom = -h / 2;
        const targetBottomH = 200 / 100;
        const minTopH = 10 / 100;
        const bottomH =
          h - targetBottomH < minTopH ? h - minTopH : targetBottomH;
        const yEndBottom = yStartBottom + bottomH;
        const yStartTop = yEndBottom;
        const yEndTop = h / 2;
        modulesY.push({ yStart: yStartBottom, yEnd: yEndBottom });
        modulesY.push({ yStart: yStartTop, yEnd: yEndTop });
      } else {
        modulesY.push({ yStart: -h / 2, yEnd: h / 2 });
      }
      // Helper to map index -> A, B, ..., Z, AA, AB, ...
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
      let idx = 0;
      modulesY.forEach((mod) => {
        for (let i = 0; i < numberOfColumns; i++) {
          const xStart = xPositions[i];
          const xEnd = xPositions[i + 1];
          const width = xEnd - xStart;
          const elementKey = toLetters(idx);
          compartments.push({
            xStart,
            xEnd,
            yStart: mod.yStart,
            yEnd: mod.yEnd,
            width,
            elementKey,
          });
          idx++;
        }
      });
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
        position: [shelfX, t + shelfSpacing * (j + 1), 0] as [
          number,
          number,
          number,
        ],
        size: [shelfWidth, t, d] as [number, number, number],
      }));
    });

    // Panel positions and sizes: split horizontally (X) into equal blocks and vertically (Y) into modules
    const panels = React.useMemo(() => {
      type PanelDef = {
        label: string;
        position: [number, number, number];
        size: [number, number, number];
      };
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
      const boundariesX = Array.from(
        { length: nBlocksX + 1 },
        (_, i) => -w / 2 + i * segWX,
      );

      // Y modules: split if height > 200cm. Bottom is 200cm only if total > 210cm; otherwise shrink bottom so top is at least 10cm
      const targetBottomH = 200 / 100; // 2.0 world units
      const minTopH = 10 / 100; // 0.1 world units
      const modulesY: {
        yStart: number;
        yEnd: number;
        height: number;
        label: string;
      }[] = [];
      if (h > 200 / 100) {
        const yStartBottom = -h / 2;
        // Ensure top >= 10cm: if remaining height < 10cm, shrink bottom accordingly
        const bottomH =
          h - targetBottomH < minTopH ? h - minTopH : targetBottomH;
        const yEndBottom = yStartBottom + bottomH;
        const yStartTop = yEndBottom;
        const yEndTop = h / 2;
        modulesY.push({
          yStart: yStartBottom,
          yEnd: yEndBottom,
          height: bottomH,
          label: "BottomModule",
        });
        modulesY.push({
          yStart: yStartTop,
          yEnd: yEndTop,
          height: yEndTop - yStartTop,
          label: "TopModule",
        });
      } else {
        modulesY.push({
          yStart: -h / 2,
          yEnd: h / 2,
          height: h,
          label: "SingleModule",
        });
      }

      // Side panels at each X boundary, per Y module
      boundariesX.forEach((x, idx) => {
        modulesY.forEach((m) => {
          const cy = (m.yStart + m.yEnd) / 2;
          if (idx === 0) {
            list.push({
              label: `Side L (${m.label})`,
              position: [x + t / 2, cy, 0],
              size: [t, m.height, d],
            });
          } else if (idx === boundariesX.length - 1) {
            list.push({
              label: `Side R (${m.label})`,
              position: [x - t / 2, cy, 0],
              size: [t, m.height, d],
            });
          } else {
            // Internal seam: two touching panels
            list.push({
              label: `Side seam ${idx}A (${m.label})`,
              position: [x - t / 2, cy, 0],
              size: [t, m.height, d],
            });
            list.push({
              label: `Side seam ${idx}B (${m.label})`,
              position: [x + t / 2, cy, 0],
              size: [t, m.height, d],
            });
          }
        });
      });

      // Top and Bottom panels per X block and Y module
      blocksX.forEach((bx, i) => {
        modulesY.forEach((m) => {
          const innerLenX = Math.max(segWX - 2 * t, 0.001);
          const cx = (bx.start + bx.end) / 2;
          const raise =
            hasBase &&
            (m.label === "BottomModule" || m.label === "SingleModule")
              ? baseH
              : 0;
          const yBottom = m.yStart + raise + t / 2;
          const yTop = m.yEnd - t / 2;
          list.push({
            label: `Bottom ${i + 1} (${m.label})`,
            position: [cx, yBottom, 0],
            size: [innerLenX, t, d],
          });
          list.push({
            label: `Top ${i + 1} (${m.label})`,
            position: [cx, yTop, 0],
            size: [innerLenX, t, d],
          });
        });
      });

      return list;
    }, [w, h, t, d, hasBase, baseH]);

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
        const bottomH =
          h - targetBottomH < minTopH ? h - minTopH : targetBottomH;
        const yEndBottom = yStartBottom + bottomH;
        const yStartTop = yEndBottom;
        const yEndTop = h / 2;
        modulesY.push({ yStart: yStartBottom, yEnd: yEndBottom });
        modulesY.push({ yStart: yStartTop, yEnd: yEndTop });
      } else {
        modulesY.push({ yStart: -h / 2, yEnd: h / 2 });
      }

      const labels: {
        key: string;
        position: [number, number, number];
        letter: string;
      }[] = [];
      let idx = 0;
      // Order: bottom-to-top, left-to-right
      modulesY.forEach((m, mIdx) => {
        const cy = (m.yStart + m.yEnd) / 2;
        blocksX.forEach((bx, bIdx) => {
          const cx = (bx.start + bx.end) / 2;
          const cz = -d / 2 + t + 0.001; // slightly in front of the back panel
          labels.push({
            key: `elem-${mIdx}-${bIdx}`,
            position: [cx, cy, cz],
            letter: toLetters(idx),
          });
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
        const bottomH =
          h - targetBottomH < minTopH ? h - minTopH : targetBottomH;
        const yEndBottom = yStartBottom + bottomH;
        const yStartTop = yEndBottom;
        const yEndTop = h / 2;
        modulesY.push({ yStart: yStartBottom, yEnd: yEndBottom });
        modulesY.push({ yStart: yStartTop, yEnd: yEndTop });
      } else {
        modulesY.push({ yStart: -h / 2, yEnd: h / 2 });
      }

      type MeshDef = {
        key: string;
        position: [number, number, number];
        size: [number, number, number];
      };
      const divs: MeshDef[] = [];
      const shs: MeshDef[] = [];

      let idx = 0;
      modulesY.forEach((m, mIdx) => {
        const yStartInner = m.yStart + t;
        const yEndInner = m.yEnd - t;
        const _innerH = Math.max(yEndInner - yStartInner, 0);
        const _cy = (yStartInner + yEndInner) / 2;
        blocksX.forEach((bx, bIdx) => {
          // Each element has its own side panels at its left and right boundary, so subtract thickness on both sides
          const xStartInner = bx.start + t;
          const xEndInner = bx.end - t;
          const innerW = Math.max(xEndInner - xStartInner, 0);
          const letter = toLetters(idx);
          const cfg = elementConfigs[letter] ?? { columns: 1, rowCounts: [0] };
          const cols = Math.max(1, cfg.columns | 0);

          // Compute drawers region for this element (letter) to constrain both shelves and vertical dividers
          const extras = compartmentExtras[letter];
          let yShelvesMin = yStartInner; // baseline for shelves (bottom bound reference)
          let yDivFromLocal = yStartInner; // bottom for internal vertical dividers
          let autoShelfExists = false;
          if (extras?.drawers) {
            const drawerH = 10 / 100;
            const gap = 1 / 100;
            const per = drawerH + gap;
            const raiseByBase =
              hasBase && (modulesY.length === 1 || mIdx === 0) ? baseH : 0;
            const drawersYStart = yStartInner + raiseByBase;
            const innerHForDrawers = Math.max(yEndInner - drawersYStart, 0);
            const maxAuto = Math.max(
              0,
              Math.floor((innerHForDrawers + gap) / per),
            );
            const countFromState = Math.max(
              0,
              Math.floor(extras.drawersCount ?? 0),
            );
            const used =
              countFromState > 0 ? Math.min(countFromState, maxAuto) : maxAuto;
            if (used > 0) {
              const drawersTopY = drawersYStart + drawerH + (used - 1) * per; // top face of last drawer
              const baseMin = Math.min(
                Math.max(drawersTopY + gap, yStartInner),
                yEndInner,
              );
              autoShelfExists = used < maxAuto && yEndInner - baseMin >= t;
              // Shelves baseline remains at top of drawers + gap
              yShelvesMin = baseMin;
              // Dividers stop at top of auto shelf if present, otherwise at drawers top + gap
              yDivFromLocal = Math.min(
                Math.max(baseMin + (autoShelfExists ? t : 0), yStartInner),
                yEndInner,
              );
            }
          }

          // Dividers (shortened above drawers/auto-shelf)
          for (let c = 1; c <= cols - 1; c++) {
            const x = xStartInner + (innerW * c) / cols;
            const hDiv = Math.max(yEndInner - yDivFromLocal, 0);
            if (hDiv > 0) {
              const yDivCy = (yDivFromLocal + yEndInner) / 2;
              divs.push({
                key: `elem-${mIdx}-${bIdx}-div-${c}`,
                position: [x, yDivCy, 0],
                size: [t, hDiv, d],
              });
            }
          }

          // Shelves constrained above drawers (if any)
          const xs: number[] = [xStartInner];
          for (let c = 1; c <= cols - 1; c++)
            xs.push(xStartInner + (innerW * c) / cols);
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
            const yStartForShelves = autoShelfExists
              ? yShelvesMin + t
              : yShelvesMin;
            const usableH = Math.max(yEndInner - yStartForShelves, 0);
            if (usableH <= 0) continue;
            const spacing = usableH / (shelfCount + 1);
            for (let s = 0; s < shelfCount; s++) {
              const y = yStartForShelves + spacing * (s + 1);
              shs.push({
                key: `elem-${mIdx}-${bIdx}-comp-${comp}-shelf-${s}`,
                position: [(left + right) / 2, y, 0],
                size: [compW, t, d],
              });
            }
          }
          idx += 1;
        });
      });
      return { dividers: divs, shelves: shs };
    }, [w, h, t, d, elementConfigs, compartmentExtras, hasBase, baseH]);

    React.useEffect(() => {
      function onMouseMove(e: MouseEvent) {
        if (draggedShelfKey) {
          const pixelToWorld = 0.01;
          let newY = initialShelfY + (e.clientY - dragOffset) * -pixelToWorld;

          const shelfMatch = draggedShelfKey.match(/^shelf-(\d+)-(\d+)$/);
          if (shelfMatch) {
            const compIdx = parseInt(shelfMatch[1], 10);
            const _shelfIdx = parseInt(shelfMatch[2], 10);
            const shelvesInComp = shelves.filter((s) =>
              s.key.startsWith(`shelf-${compIdx}-`),
            );
            const sortedShelves = shelvesInComp
              .map((s) => ({
                ...s,
                y: customShelfPositions[s.key] ?? s.position[1],
              }))
              .sort((a, b) => a.y - b.y);
            const idx = sortedShelves.findIndex(
              (s) => s.key === draggedShelfKey,
            );
            const minGap = 10 / 100;
            const yAbove = idx > 0 ? sortedShelves[idx - 1].y : t;
            const yBelow =
              idx < sortedShelves.length - 1 ? sortedShelves[idx + 1].y : h - t;
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

          const dividerIndex = dividers.findIndex(
            (div) => div.id === draggedDividerKey,
          );
          const prevX =
            dividerIndex === 0
              ? -innerWidth / 2
              : (customDividerPositions[`divider-${dividerIndex - 1}`] ??
                dividers[dividerIndex - 1].position[0]);
          const nextX =
            dividerIndex === dividers.length - 1
              ? innerWidth / 2
              : (customDividerPositions[`divider-${dividerIndex + 1}`] ??
                dividers[dividerIndex + 1].position[0]);
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
    }, [
      draggedShelfKey,
      draggedDividerKey,
      dragOffset,
      initialShelfY,
      initialDividerX,
      innerWidth,
      h,
      t,
      dividers,
      customDividerPositions,
      customShelfPositions,
      shelves.filter,
    ]);

    // Handler to show/hide all shelf and divider info overlays (to be called from parent)
    const toggleAllInfo = (show: boolean) => {
      setShowShelfLabels(
        shelves.reduce(
          (acc, shelf) => {
            acc[shelf.key] = show;
            return acc;
          },
          {} as Record<string, boolean>,
        ),
      );
      setShowDividerLabels(
        dividers.reduce(
          (acc, divider) => {
            acc[divider.id] = show;
            return acc;
          },
          {} as Record<string, boolean>,
        ),
      );
      // Do NOT touch panel overlays
    };

    // Expose the handler for parent via ref
    React.useImperativeHandle(ref, () => ({ toggleAllInfo }), [toggleAllInfo]);

    return (
      <group>
        {/* Technical 2D: white fill (unlit). Otherwise use selected material color. */}
        {showEdgesOnly ? (
          <meshBasicMaterial color="#ffffff" toneMapped={false} />
        ) : (
          <meshStandardMaterial color={color} />
        )}

        {/* Side, Top, and Bottom Panels with labels */}
        {panels.map((panel) => {
          const [x, y, z] = panel.position as [number, number, number];
          const yOffset = 0.05;

          return (
            <group key={panel.label}>
              <Panel position={panel.position} size={panel.size} />
              <Html
                position={[x, y + yOffset, z]}
                center
                distanceFactor={cameraMode === "3D" ? 4 : 8}
                style={{ pointerEvents: "auto" }}
                zIndexRange={[0, 0]}
              >
                <div style={{ position: "relative" }}>
                  <button
                    style={{
                      fontSize: "4px",
                      padding: "2px 6px",
                      borderRadius: "4px",
                      border: "1px solid #888",
                      background: "#fff",
                      cursor: "pointer",
                      minWidth: "28px",
                    }}
                    onClick={(e) => {
                      e.stopPropagation();
                      setShowPanelLabels((prev) => ({
                        ...prev,
                        [panel.label]: !prev[panel.label],
                      }));
                    }}
                  >
                    {showPanelLabels[panel.label] ? "Sakrij" : "Prikaži"}
                  </button>
                  {showPanelLabels[panel.label] && (
                    <div
                      style={{
                        position: "absolute",
                        top: "100%",
                        left: "50%",
                        transform: "translateX(-50%)",
                        background: "rgba(255,255,255,0.85)",
                        padding: "2px 6px",
                        borderRadius: "4px",
                        fontSize: "4px",
                        color: "#222",
                        border: "1px solid #ccc",
                        marginTop: "2px",
                        whiteSpace: "pre",
                        zIndex: 10,
                      }}
                    >
                      {panel.label}
                      <br />
                      pos: [
                      {(panel.position as number[])
                        .map((n: number) => n.toFixed(3))
                        .join(", ")}
                      ]
                      <br />
                      size: [
                      {(panel.size as number[])
                        .map((n: number) => n.toFixed(3))
                        .join(", ")}
                      ]
                    </div>
                  )}
                </div>
              </Html>
            </group>
          );
        })}

        {/* Element letter markers on the back side */}
        {elementLabels.map((el) => (
          <Html
            key={el.key}
            position={el.position}
            center
            distanceFactor={cameraMode === "3D" ? 4 : 8}
            zIndexRange={[0, 0]}
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
                  zIndexRange={[0, 0]}
                >
                  <div style={{ position: "relative" }}>
                    <div
                      style={{ display: "flex", alignItems: "center", gap: 4 }}
                    >
                      {/* Show Info Button */}
                      <button
                        style={{
                          fontSize: "4px",
                          padding: "2px 6px",
                          borderRadius: "4px",
                          border: "1px solid #888",
                          background: "#fff",
                          cursor: "pointer",
                          minWidth: "28px",
                        }}
                        onClick={(e) => {
                          e.stopPropagation();
                          setShowDividerLabels((prev) => ({
                            ...prev,
                            [divider.id]: !prev[divider.id],
                          }));
                        }}
                      >
                        {showDividerLabels[divider.id] ? "Sakrij" : "Prikaži"}
                      </button>
                      {/* Drag Button */}
                      <button
                        style={{
                          width: 20,
                          height: 20,
                          borderRadius: "50%",
                          border: "1px solid #888",
                          background:
                            draggedDividerKey === divider.id ? "#eee" : "#fff",
                          cursor:
                            draggedDividerKey === divider.id
                              ? "grabbing"
                              : "grab",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                        }}
                        onMouseDown={(e) => {
                          e.stopPropagation();
                          setDraggedDividerKey(divider.id);
                          setDragOffset(e.clientX);
                          setInitialDividerX(
                            customDividerPositions[divider.id] ??
                              divider.position[0],
                          );
                          document.body.style.userSelect = "none";
                        }}
                      >
                        <img
                          src="/up-down-arrow-icon.png"
                          alt="Drag Divider"
                          style={{
                            width: 14,
                            height: 14,
                            pointerEvents: "none",
                          }}
                        />
                      </button>
                    </div>
                    {showDividerLabels[divider.id] && (
                      <div
                        style={{
                          position: "absolute",
                          top: "100%",
                          left: 0,
                          background: "rgba(255,255,255,0.85)",
                          padding: "2px 6px",
                          borderRadius: "4px",
                          fontSize: "4px",
                          color: "#222",
                          border: "1px solid #ccc",
                          marginTop: "2px",
                          whiteSpace: "pre",
                          zIndex: 10,
                        }}
                      >
                        Divider {i + 1}
                        <br />
                        pos: [
                        {(divider.position as number[])
                          .map((n: number) => n.toFixed(3))
                          .join(", ")}
                        ]
                        <br />
                        size: [
                        {(divider.size as number[])
                          .map((n: number) => n.toFixed(3))
                          .join(", ")}
                        ]
                      </div>
                    )}
                  </div>
                </Html>
              </group>
            ))}

            {/* Dynamic Horizontal Shelves with button */}
            {shelves.map((shelf) => (
              <group key={shelf.key}>
                <Panel
                  position={[
                    shelf.position[0],
                    customShelfPositions[shelf.key] ?? shelf.position[1],
                    shelf.position[2],
                  ]}
                  size={shelf.size}
                />
                <Html
                  position={[
                    shelf.position[0],
                    (customShelfPositions[shelf.key] ?? shelf.position[1]) +
                      0.03,
                    shelf.position[2] + shelf.size[2] / 2,
                  ]}
                  center
                  distanceFactor={8}
                  style={{ pointerEvents: "auto" }}
                  zIndexRange={[0, 0]}
                >
                  <div style={{ position: "relative" }}>
                    <div
                      style={{ display: "flex", alignItems: "center", gap: 4 }}
                    >
                      {/* Show Info Button */}
                      <button
                        style={{
                          fontSize: "4px",
                          padding: "2px 6px",
                          borderRadius: "4px",
                          border: "1px solid #888",
                          background: "#fff",
                          cursor: "pointer",
                          minWidth: "28px",
                        }}
                        onClick={(e) => {
                          e.stopPropagation();
                          setShowShelfLabels((prev) => ({
                            ...prev,
                            [shelf.key]: !prev[shelf.key],
                          }));
                        }}
                      >
                        {showShelfLabels[shelf.key] ? "Sakrij" : "Prikaži"}
                      </button>
                      {/* Drag Button */}
                      <button
                        style={{
                          width: 20,
                          height: 20,
                          borderRadius: "50%",
                          border: "1px solid #888",
                          background:
                            draggedShelfKey === shelf.key ? "#eee" : "#fff",
                          cursor:
                            draggedShelfKey === shelf.key ? "grabbing" : "grab",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                        }}
                        onMouseDown={(e) => {
                          e.stopPropagation();
                          setDraggedShelfKey(shelf.key);
                          setDragOffset(e.clientY);
                          setInitialShelfY(
                            customShelfPositions[shelf.key] ??
                              shelf.position[1],
                          );
                          document.body.style.userSelect = "none";
                        }}
                      >
                        <img
                          src="/up-down-arrow-icon.png"
                          alt="Drag Shelf"
                          style={{
                            width: 14,
                            height: 14,
                            pointerEvents: "none",
                          }}
                        />
                      </button>
                    </div>
                    {showShelfLabels[shelf.key] && (
                      <div
                        style={{
                          position: "absolute",
                          top: "100%",
                          left: 0,
                          background: "rgba(255,255,255,0.85)",
                          padding: "2px 6px",
                          borderRadius: "4px",
                          fontSize: "4px",
                          color: "#222",
                          border: "1px solid #ccc",
                          marginTop: "2px",
                          whiteSpace: "pre",
                          zIndex: 10,
                        }}
                      >
                        {`Shelf\npos: [${shelf.position
                          .map((n) => n.toFixed(3))
                          .join(", ")}]\nsize: [${shelf.size
                          .map((n) => n.toFixed(3))
                          .join(", ")} ]`}
                      </div>
                    )}
                  </div>
                </Html>
              </group>
            ))}
          </>
        )}

        {/* Extras element selection buttons moved to left menu (ConfiguratorControls) */}

        {/* Selected-element preview removed: extras are now persisted and rendered for all elements below */}

        {/* Render extras for all elements that have them toggled (persist across selection) */}
        {(() => {
          // Helper to map index -> A, B, ..., Z, AA, AB, ...
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

          // Build element regions exactly like elementLabels
          const maxSegX = 100 / 100; // 1.0
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
            const bottomH =
              h - targetBottomH < minTopH ? h - minTopH : targetBottomH;
            const yEndBottom = yStartBottom + bottomH;
            const yStartTop = yEndBottom;
            const yEndTop = h / 2;
            modulesY.push({ yStart: yStartBottom, yEnd: yEndBottom });
            modulesY.push({ yStart: yStartTop, yEnd: yEndTop });
          } else {
            modulesY.push({ yStart: -h / 2, yEnd: h / 2 });
          }

          const nodes: React.ReactNode[] = [];
          let idx = 0;
          modulesY.forEach((m, mIdx) => {
            blocksX.forEach((bx) => {
              const letter = toLetters(idx);
              const extras = compartmentExtras[letter];
              if (
                extras &&
                (extras.verticalDivider || extras.drawers || extras.rod)
              ) {
                // Inner bounds for this element
                const xStartInner = bx.start + t;
                const xEndInner = bx.end - t;
                const yStartInner = m.yStart + t;
                const yEndInner = m.yEnd - t;
                const innerW = Math.max(xEndInner - xStartInner, 0);
                const _innerH = Math.max(yEndInner - yStartInner, 0);
                const cx = (xStartInner + xEndInner) / 2;
                const _cy = (yStartInner + yEndInner) / 2;

                // Compute drawers region for this element to constrain vertical divider height
                const drawerH = 10 / 100; // 10cm
                const gap = 1 / 100; // 1cm
                const per = drawerH + gap;
                const raiseByBase =
                  hasBase && (modulesY.length === 1 || mIdx === 0) ? baseH : 0;
                const drawersYStart = yStartInner + raiseByBase;
                const innerHForDrawers = Math.max(yEndInner - drawersYStart, 0);
                const maxAuto = Math.max(
                  0,
                  Math.floor((innerHForDrawers + gap) / per),
                );
                const countFromState = Math.max(
                  0,
                  Math.floor(extras.drawersCount ?? 0),
                );
                const usedDrawerCount = extras.drawers
                  ? countFromState > 0
                    ? Math.min(countFromState, maxAuto)
                    : maxAuto
                  : 0;
                const drawersTopY =
                  usedDrawerCount > 0
                    ? drawersYStart + drawerH + (usedDrawerCount - 1) * per
                    : 0;
                const autoShelfExists =
                  usedDrawerCount > 0 &&
                  usedDrawerCount < maxAuto &&
                  yEndInner - (drawersTopY + gap) >= t;

                // Vertical divider at center, shortened to end at top of drawers (and above auto shelf if present)
                let yDivFrom = yStartInner;
                if (usedDrawerCount > 0) {
                  const baseFrom =
                    drawersTopY + gap + (autoShelfExists ? t : 0);
                  yDivFrom = Math.min(
                    Math.max(baseFrom, yStartInner),
                    yEndInner,
                  );
                }
                const divH = Math.max(yEndInner - yDivFrom, 0);
                if (extras.verticalDivider && divH > 0) {
                  nodes.push(
                    <Panel
                      key={`${letter}-vdiv`}
                      position={[cx, (yDivFrom + yEndInner) / 2, 0]}
                      size={[t, divH, d]}
                    />,
                  );
                }

                // Drawers stack (respect base height in bottom or single module)
                if (extras.drawers) {
                  for (let didx = 0; didx < usedDrawerCount; didx++) {
                    const y = drawersYStart + drawerH / 2 + didx * per;
                    nodes.push(
                      <Panel
                        key={`${letter}-drawer-${didx}`}
                        position={[cx, y, 0]}
                        size={[innerW, drawerH, d]}
                      />,
                    );
                  }

                  // Auto-shelf directly above drawers if they don't fill the full available height
                  if (usedDrawerCount > 0 && usedDrawerCount < maxAuto) {
                    const drawersTopY =
                      drawersYStart + drawerH + (usedDrawerCount - 1) * per;
                    const shelfPlaneY = drawersTopY + gap; // bottom plane of the shelf
                    const remaining = yEndInner - shelfPlaneY;
                    if (remaining >= t) {
                      const yShelfCenter = shelfPlaneY + t / 2;
                      nodes.push(
                        <Panel
                          key={`${letter}-shelf-over-drawers`}
                          position={[cx, yShelfCenter, 0]}
                          size={[innerW, t, d]}
                        />,
                      );
                    }
                  }
                }

                // Rod across width, horizontal
                if (extras.rod) {
                  const rodY = yEndInner - 10 / 100; // 10cm below top
                  const radius = 3 / 100 / 2; // 3cm diameter
                  nodes.push(
                    <mesh
                      key={`${letter}-rod`}
                      position={[cx, rodY, 0]}
                      rotation={[0, 0, Math.PI / 2]}
                    >
                      <cylinderGeometry args={[radius, radius, innerW, 16]} />
                      <meshStandardMaterial color="#888" />
                    </mesh>,
                  );
                }
              }
              idx += 1;
            });
          });

          if (nodes.length === 0) return null;
          return <group key="extras-all">{nodes}</group>;
        })()}

        {/* Back panels per element (5mm), with 2mm clearance in width and height, centered */}
        {(() => {
          const clearance = 2 / 1000; // 2mm in world units
          const maxSegX = 100 / 100; // element width segmentation
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
            const bottomH =
              h - targetBottomH < minTopH ? h - minTopH : targetBottomH;
            const yEndBottom = yStartBottom + bottomH;
            const yStartTop = yEndBottom;
            const yEndTop = h / 2;
            modulesY.push({ yStart: yStartBottom, yEnd: yEndBottom });
            modulesY.push({ yStart: yStartTop, yEnd: yEndTop });
          } else {
            modulesY.push({ yStart: -h / 2, yEnd: h / 2 });
          }
          const nodes: React.ReactNode[] = [];
          let idx = 0;
          modulesY.forEach((m) => {
            const elemH = m.yEnd - m.yStart; // full element height
            // Back panel height: use full element height, then reduce by 2mm total
            const backH = Math.max(elemH - clearance, 0.001);
            const cy = (m.yStart + m.yEnd) / 2;
            blocksX.forEach((bx) => {
              const elemW = bx.end - bx.start; // full element width
              // Back panel width: use full element width, then reduce by 2mm total
              const backW = Math.max(elemW - clearance, 0.001);
              const cx = (bx.start + bx.end) / 2;
              const z = -d / 2 - backT / 2; // exact: carcass depth + back thickness = selected total depth
              nodes.push(
                <Panel
                  key={`back-${idx}`}
                  position={[cx, cy, z]}
                  size={[backW, backH, backT]}
                />,
              );
              idx += 1;
            });
          });
          if (nodes.length === 0) return null;
          return <group key="backs-all">{nodes}</group>;
        })()}

        {/* Doors rendering per element selection */}
        {(() => {
          if (!doorSelections || Object.keys(doorSelections).length === 0)
            return null;
          // Rebuild element grid (same mapping as labels and menus)
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
            const bottomH =
              h - targetBottomH < minTopH ? h - minTopH : targetBottomH;
            const yEndBottom = yStartBottom + bottomH;
            const yStartTop = yEndBottom;
            const yEndTop = h / 2;
            modulesY.push({ yStart: yStartBottom, yEnd: yEndBottom });
            modulesY.push({ yStart: yStartTop, yEnd: yEndTop });
          } else {
            modulesY.push({ yStart: -h / 2, yEnd: h / 2 });
          }

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

          const nodes: React.ReactNode[] = [];
          const doorT = 18 / 1000; // 1.8 cm
          const clearance = 1 / 1000; // 1 mm overall clearance (width & height)
          const doubleGap = 3 / 1000; // 3 mm gap between double doors
          // Place doors slightly in front of the carcass front face to avoid z-fighting
          const zFront = d / 2 + doorT / 2 + 0.0005;
          let idx = 0;
          modulesY.forEach((m) => {
            const elemH = m.yEnd - m.yStart;
            const doorH = Math.max(elemH - clearance, 0.001);
            const cy = (m.yStart + m.yEnd) / 2;
            blocksX.forEach((bx) => {
              const letter = toLetters(idx);
              const sel = doorSelections[letter];
              if (sel && sel !== "none") {
                const elemW = bx.end - bx.start;
                const cx = (bx.start + bx.end) / 2;
                const totalAvailW = Math.max(elemW - clearance, 0.001);
                if (sel === "double" || sel === "doubleMirror") {
                  const leafW = Math.max((totalAvailW - doubleGap) / 2, 0.001);
                  const offset = (leafW + doubleGap) / 2;
                  // Left leaf
                  nodes.push(
                    <Panel
                      key={`door-${letter}-L`}
                      position={[cx - offset, cy, zFront]}
                      size={[leafW, doorH, doorT]}
                    />,
                  );
                  // Right leaf
                  nodes.push(
                    <Panel
                      key={`door-${letter}-R`}
                      position={[cx + offset, cy, zFront]}
                      size={[leafW, doorH, doorT]}
                    />,
                  );
                } else {
                  // Single leaf (left/right/mirror/drawerStyle) with 1mm overall width & height clearance
                  const leafW = totalAvailW;
                  nodes.push(
                    <Panel
                      key={`door-${letter}`}
                      position={[cx, cy, zFront]}
                      size={[leafW, doorH, doorT]}
                    />,
                  );
                }
              }
              idx += 1;
            });
          });
          if (nodes.length === 0) return null;
          return <group key="doors-all">{nodes}</group>;
        })()}

        {/* Compartment labels */}
        {compartments.map((comp, i) => {
          const position = [(comp.xStart + comp.xEnd) / 2, h / 2, 0.05] as [
            number,
            number,
            number,
          ];
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
                {`Compartment ${i + 1}\npos: [${position
                  .map((n) => n.toFixed(2))
                  .join(", ")}]\nsize: [${size
                  .map((n) => n.toFixed(2))
                  .join(", ")}]`}
              </Html>
            )
          );
        })}

        {showDimensions && (
          <group key="dim-lines">
            {(() => {
              const xMin = -w / 2;
              const xMax = w / 2;
              const yMin = -h / 2;
              const _yMax = h / 2;

              const theta = (30 / 180) * Math.PI; // 30° arrow wings
              const ah = 0.03; // 3cm arrow wing length
              const lineThk = 0.002; // 2mm line thickness

              const nodes: React.ReactNode[] = [];

              // Helper: add a wing (small line) at apex with direction vector v (normalized), length ah and rotation by angle
              const addWing = (
                key: string,
                apex: [number, number],
                angle: number,
              ) => {
                const dir = new THREE.Vector2(Math.cos(angle), Math.sin(angle));
                const center = new THREE.Vector2(
                  apex[0],
                  apex[1],
                ).addScaledVector(dir, ah / 2);
                nodes.push(
                  <mesh
                    key={key}
                    position={[center.x, center.y, 0]}
                    rotation={[0, 0, angle]}
                  >
                    <boxGeometry args={[ah, lineThk, lineThk]} />
                    <meshBasicMaterial color="white" />
                  </mesh>,
                );
              };

              // Bottom chain dimensions per element-width (blocks of max 100cm)
              const offsetY = yMin - 0.06; // 6cm below
              const maxSegX = 100 / 100;
              const nBlocksX = Math.max(1, Math.ceil(w / maxSegX));
              const segWX = w / nBlocksX;
              const margin = ah * Math.cos(theta);

              for (let i = 0; i < nBlocksX; i++) {
                const start = xMin + i * segWX;
                const end = start + segWX;
                const mid = (start + end) / 2;
                const widthCm = Math.round((end - start) * 100);

                // dimension line between arrowheads
                const len = Math.max(0, end - margin - (start + margin));
                if (len > 0) {
                  const cx = (start + margin + end - margin) / 2;
                  nodes.push(
                    <mesh key={`dim-bot-line-${i}`} position={[cx, offsetY, 0]}>
                      <boxGeometry args={[len, lineThk, lineThk]} />
                      <meshBasicMaterial color="white" />
                    </mesh>,
                  );
                }

                // arrowheads (wings) pointing inward
                const leftApex: [number, number] = [start, offsetY];
                addWing(`dim-bot-left-w1-${i}`, leftApex, +theta);
                addWing(`dim-bot-left-w2-${i}`, leftApex, -theta);

                const rightApex: [number, number] = [end, offsetY];
                addWing(`dim-bot-right-w1-${i}`, rightApex, Math.PI - theta);
                addWing(`dim-bot-right-w2-${i}`, rightApex, Math.PI + theta);

                // centered label (Text renders into WebGL, so it appears in exports)
                nodes.push(
                  <Text
                    key={`dim-bot-lbl-${i}`}
                    position={[mid, offsetY - 0.03, 0]}
                    fontSize={0.04}
                    color="white"
                    anchorX="center"
                    anchorY="middle"
                  >
                    {`${widthCm} cm`}
                  </Text>,
                );
              }

              // Segmented vertical dimensions per Y-module (like horizontal chain)
              const xOff = 0.08; // 8cm offset from sides
              const leftX = xMin - xOff;
              const rightX = xMax + xOff;

              // Build Y-modules (same logic used elsewhere)
              const targetBottomH = 200 / 100;
              const minTopH = 10 / 100;
              const modulesY: { yStart: number; yEnd: number }[] = [];
              if (h > 200 / 100) {
                const yStartBottom = -h / 2;
                const bottomH =
                  h - targetBottomH < minTopH ? h - minTopH : targetBottomH;
                const yEndBottom = yStartBottom + bottomH;
                const yStartTop = yEndBottom;
                const yEndTop = h / 2;
                modulesY.push({ yStart: yStartBottom, yEnd: yEndBottom });
                modulesY.push({ yStart: yStartTop, yEnd: yEndTop });
              } else {
                modulesY.push({ yStart: -h / 2, yEnd: h / 2 });
              }

              const vMargin = ah * Math.cos(theta);

              const addVerticalSegment = (
                side: "left" | "right",
                x: number,
                y0: number,
                y1: number,
                idx: number,
              ) => {
                const yStart = Math.min(y0, y1);
                const yEnd = Math.max(y0, y1);
                const vLen = Math.max(0, yEnd - vMargin - (yStart + vMargin));
                if (vLen > 0) {
                  const cy = (yStart + vMargin + yEnd - vMargin) / 2;
                  nodes.push(
                    <mesh
                      key={`dim-${side}-seg-line-${idx}`}
                      position={[x, cy, 0]}
                    >
                      <boxGeometry args={[lineThk, vLen, lineThk]} />
                      <meshBasicMaterial color="white" />
                    </mesh>,
                  );
                }

                // arrow wings at top (pointing downward)
                const topApex: [number, number] = [x, yEnd];
                addWing(
                  `dim-${side}-seg-top-w1-${idx}`,
                  topApex,
                  -(Math.PI / 2 - theta),
                );
                addWing(
                  `dim-${side}-seg-top-w2-${idx}`,
                  topApex,
                  -(Math.PI / 2 + theta),
                );
                // arrow wings at bottom (pointing upward)
                const botApex: [number, number] = [x, yStart];
                addWing(
                  `dim-${side}-seg-bot-w1-${idx}`,
                  botApex,
                  +(Math.PI / 2 - theta),
                );
                addWing(
                  `dim-${side}-seg-bot-w2-${idx}`,
                  botApex,
                  +(Math.PI / 2 + theta),
                );

                // label centered on the segment
                const segMidY = (yStart + yEnd) / 2;
                const segCm = Math.round((yEnd - yStart) * 100);
                nodes.push(
                  <Text
                    key={`dim-${side}-seg-lbl-${idx}`}
                    position={[
                      x + (side === "left" ? -0.05 : 0.05),
                      segMidY,
                      0,
                    ]}
                    fontSize={0.04}
                    color="white"
                    anchorX={side === "left" ? "right" : "left"}
                    anchorY="middle"
                  >
                    {`${segCm} cm`}
                  </Text>,
                );
              };

              modulesY.forEach((m, i) => {
                addVerticalSegment("left", leftX, m.yStart, m.yEnd, i);
                addVerticalSegment("right", rightX, m.yStart, m.yEnd, i);
              });

              return <>{nodes}</>;
            })()}
          </group>
        )}
      </group>
    );
  },
);

export default CarcassFrame;
