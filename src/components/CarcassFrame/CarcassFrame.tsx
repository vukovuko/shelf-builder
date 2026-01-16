"use client";
import { Html, Text } from "@react-three/drei";
import React from "react";
import * as THREE from "three";
import { useShelfStore } from "../../lib/store";
import { Panel } from "../Panel";
import {
  toLetters,
  buildBlocksX,
  buildModulesY,
  buildModulesYForColumn,
  getDefaultBoundariesX,
} from "./utils";
import {
  DRAWER_HEIGHT,
  DRAWER_GAP,
  MIN_DRAG_GAP,
  MIN_SEGMENT,
  MAX_SEGMENT_X,
  TARGET_BOTTOM_HEIGHT,
  MIN_TOP_HEIGHT,
} from "./constants";

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
    const showDoors = useShelfStore((s) => s.showDoors);
    const showInfoButtons = useShelfStore((s) => s.showInfoButtons);

    // Vertical structural boundaries (seam positions) - DEPRECATED, kept for backward compatibility fallback
    const verticalBoundaries = useShelfStore((s) => s.verticalBoundaries);
    // Per-module vertical boundaries (NEW: each module has independent boundaries)
    const moduleVerticalBoundaries = useShelfStore(
      (s) => s.moduleVerticalBoundaries,
    );
    const setModuleVerticalBoundaries = useShelfStore(
      (s) => s.setModuleVerticalBoundaries,
    );
    // Horizontal boundary (module split Y position) - DEPRECATED, use per-column
    const horizontalBoundary = useShelfStore((s) => s.horizontalBoundary);
    const setHorizontalBoundary = useShelfStore((s) => s.setHorizontalBoundary);
    // Per-column horizontal boundaries (NEW: each column has independent horizontal split)
    const columnHorizontalBoundaries = useShelfStore(
      (s) => s.columnHorizontalBoundaries,
    );
    const setColumnHorizontalBoundary = useShelfStore(
      (s) => s.setColumnHorizontalBoundary,
    );
    const setIsDragging = useShelfStore((s) => s.setIsDragging);

    // Refs for seam dragging - tracks active drag state (now includes moduleKey)
    const seamDragRef = React.useRef<{
      index: number | null;
      moduleKey: string;
      startMouseX: number;
      baseBoundaries: number[];
    }>({ index: null, moduleKey: "", startMouseX: 0, baseBoundaries: [] });
    // Track if seam drag is active (to trigger useEffect)
    const [isSeamDragging, setIsSeamDragging] = React.useState<boolean>(false);

    // Refs for horizontal boundary dragging (Top panel drag) - now tracks column index
    const hBoundaryDragRef = React.useRef<{
      active: boolean;
      colIndex: number; // Which column is being dragged
      startY: number;
      startMouseY: number;
    }>({ active: false, colIndex: 0, startY: 0, startMouseY: 0 });
    // Track if horizontal boundary drag is active (to trigger useEffect)
    const [isHBoundaryDragging, setIsHBoundaryDragging] =
      React.useState<boolean>(false);

    // LOCAL drag state for performance - only commit to store on mouseUp
    // Now tracks which module is being dragged for per-module boundaries
    // And which column for per-column horizontal boundaries
    const [localBoundaries, setLocalBoundaries] = React.useState<{
      moduleKey: string | null;
      vertical: number[] | null;
      // Per-column horizontal boundaries during drag
      columnHorizontal: Record<number, number | null>;
    }>({ moduleKey: null, vertical: null, columnHorizontal: {} });

    // Ref to track latest localBoundaries for use in event handlers without causing effect re-runs
    const localBoundariesRef = React.useRef(localBoundaries);
    React.useEffect(() => {
      localBoundariesRef.current = localBoundaries;
    }, [localBoundaries]);

    // Helper to get effective boundaries for a specific module
    // Uses local state during drag (if dragging this module), otherwise uses store values
    const getEffectiveBoundariesForModule = React.useCallback(
      (moduleKey: string): number[] => {
        // If we're dragging this specific module, use local boundaries
        if (
          localBoundaries.moduleKey === moduleKey &&
          localBoundaries.vertical
        ) {
          return localBoundaries.vertical;
        }
        // Otherwise use store values - first check new per-module, then fall back to old global
        const moduleBoundaries = moduleVerticalBoundaries[moduleKey];
        if (moduleBoundaries && moduleBoundaries.length > 0) {
          return moduleBoundaries;
        }
        // Fall back to deprecated global boundaries for backward compatibility
        return verticalBoundaries;
      },
      [localBoundaries, moduleVerticalBoundaries, verticalBoundaries],
    );

    // Keep these for backward compatibility with existing code
    const effectiveVerticalBoundaries =
      localBoundaries.vertical ?? verticalBoundaries;

    // Helper to get effective horizontal boundary for a specific column
    // Uses local state during drag (if dragging this column), otherwise uses store values
    const getEffectiveHorizontalBoundaryForColumn = React.useCallback(
      (colIndex: number): number | null => {
        // If we're dragging this specific column, use local boundary
        if (colIndex in localBoundaries.columnHorizontal) {
          return localBoundaries.columnHorizontal[colIndex];
        }
        // Otherwise check store's per-column boundaries
        if (colIndex in columnHorizontalBoundaries) {
          return columnHorizontalBoundaries[colIndex];
        }
        // Fall back to global horizontal boundary
        return horizontalBoundary;
      },
      [localBoundaries.columnHorizontal, columnHorizontalBoundaries, horizontalBoundary],
    );

    // For code that doesn't need per-column (backward compat)
    const effectiveHorizontalBoundary = horizontalBoundary;

    // Guard against empty materials array (before DB data loads)
    if (materials.length === 0) {
      return null;
    }

    const material =
      materials.find(
        (m: Material) => String(m.id) === String(selectedMaterialId),
      ) || materials[0];
    const t = (material.thickness ?? 18) / 1000;

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
    // Account for base: dividers should stop at the base, not go through it
    const dividers = dividerPositions.map((xPos, i) => {
      const customX = customDividerPositions[`divider-${i}`] ?? xPos;
      const dividerHeight = h - 2 * t - baseH; // Subtract base height
      const dividerY = (h + baseH) / 2; // Shift up by half of baseH
      return {
        id: `divider-${i}`,
        position: [customX, dividerY, 0] as [number, number, number],
        size: [t, dividerHeight, d] as [number, number, number],
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
      const modulesY = buildModulesY(h, false, horizontalBoundary);
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
    // Now supports per-module vertical boundaries AND per-column horizontal boundaries
    const panels = React.useMemo(() => {
      type PanelDef = {
        label: string;
        position: [number, number, number];
        size: [number, number, number];
        seamIndex?: number; // Index of the seam boundary (for vertical drag functionality)
        moduleKey?: string; // Which module this panel belongs to (for per-module vertical dragging)
        colIndex?: number; // Which column this panel belongs to (for per-column horizontal dragging)
      };
      const list: PanelDef[] = [];

      // Get reference modules for determining side panel structure
      // Use global horizontal boundary for consistent side panel heights
      const referenceModulesY = buildModulesY(h, true, effectiveHorizontalBoundary);

      // Process each reference module for SIDE panels (L, R, seams)
      // Side panels span full module height regardless of per-column boundaries
      referenceModulesY.forEach((m) => {
        const moduleKey = m.label ?? "SingleModule";
        const cy = (m.yStart + m.yEnd) / 2;

        // Get effective vertical boundaries for THIS module (may differ from other modules)
        const moduleBoundaries = getEffectiveBoundariesForModule(moduleKey);
        const blocksX = buildBlocksX(
          w,
          moduleBoundaries.length > 0 ? moduleBoundaries : undefined,
        );
        const boundariesX = blocksX
          .map((b) => b.start)
          .concat([blocksX[blocksX.length - 1]?.end ?? w / 2]);

        // Side panels at each X boundary for this module
        boundariesX.forEach((x, idx) => {
          if (idx === 0) {
            list.push({
              label: `Side L (${m.label})`,
              position: [x + t / 2, cy, 0],
              size: [t, m.height, d],
              moduleKey,
            });
          } else if (idx === boundariesX.length - 1) {
            list.push({
              label: `Side R (${m.label})`,
              position: [x - t / 2, cy, 0],
              size: [t, m.height, d],
              moduleKey,
            });
          } else {
            // Internal seam: two touching panels - stop at base, don't go through it
            const raiseForSeam =
              hasBase &&
              (m.label === "BottomModule" || m.label === "SingleModule")
                ? baseH
                : 0;
            const seamHeight = m.height - raiseForSeam;
            const seamCy = (m.yStart + raiseForSeam + m.yEnd) / 2;
            // seamIndex is idx - 1 because idx 0 is left edge, idx 1 is first internal boundary
            const seamBoundaryIndex = idx - 1;
            list.push({
              label: `Side seam ${idx}A (${m.label})`,
              position: [x - t / 2, seamCy, 0],
              size: [t, seamHeight, d],
              seamIndex: seamBoundaryIndex,
              moduleKey,
            });
            list.push({
              label: `Side seam ${idx}B (${m.label})`,
              position: [x + t / 2, seamCy, 0],
              size: [t, seamHeight, d],
              seamIndex: seamBoundaryIndex,
              moduleKey,
            });
          }
        });
      });

      // Generate TOP/BOTTOM panels using PER-COLUMN horizontal boundaries
      // First, get blocks X from a reference module (typically BottomModule or SingleModule)
      const refModuleKey =
        referenceModulesY.find((m) => m.label === "BottomModule")?.label ??
        referenceModulesY[0]?.label ??
        "SingleModule";
      const refBoundaries = getEffectiveBoundariesForModule(refModuleKey);
      const allBlocksX = buildBlocksX(
        w,
        refBoundaries.length > 0 ? refBoundaries : undefined,
      );

      // For each column, generate top/bottom panels based on that column's specific modules
      allBlocksX.forEach((bx, colIdx) => {
        // Get this column's modules using per-column horizontal boundary
        const colBoundary = getEffectiveHorizontalBoundaryForColumn(colIdx);
        const colModulesY = buildModulesY(h, true, colBoundary);

        colModulesY.forEach((m) => {
          const innerLenX = Math.max(bx.width - 2 * t, 0.001);
          const cx = (bx.start + bx.end) / 2;
          const raise =
            hasBase &&
            (m.label === "BottomModule" || m.label === "SingleModule")
              ? baseH
              : 0;
          const yBottom = m.yStart + raise + t / 2;
          const yTop = m.yEnd - t / 2;

          list.push({
            label: `Bottom ${colIdx + 1} (${m.label})`,
            position: [cx, yBottom, 0],
            size: [innerLenX, t, d],
            moduleKey: m.label,
            colIndex: colIdx,
          });
          list.push({
            label: `Top ${colIdx + 1} (${m.label})`,
            position: [cx, yTop, 0],
            size: [innerLenX, t, d],
            moduleKey: m.label,
            colIndex: colIdx,
          });
        });
      });

      return list;
    }, [
      w,
      h,
      t,
      d,
      width,
      hasBase,
      baseH,
      effectiveHorizontalBoundary,
      getEffectiveBoundariesForModule,
      getEffectiveHorizontalBoundaryForColumn,
    ]);

    // Element letter labels (A, B, C, ...) at each element's center on the back side
    // Now uses per-module boundaries for accurate positioning
    const elementLabels = React.useMemo(() => {
      const modulesY = buildModulesY(h, true, effectiveHorizontalBoundary);

      const labels: {
        key: string;
        position: [number, number, number];
        letter: string;
      }[] = [];
      let idx = 0;
      // Order: bottom-to-top, left-to-right
      modulesY.forEach((m, mIdx) => {
        const moduleKey = m.label ?? "SingleModule";
        const cy = (m.yStart + m.yEnd) / 2;
        // Get blocks for THIS module specifically
        const moduleBoundaries = getEffectiveBoundariesForModule(moduleKey);
        const blocksX = buildBlocksX(
          w,
          moduleBoundaries.length > 0 ? moduleBoundaries : undefined,
        );
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
    }, [
      w,
      h,
      d,
      t,
      effectiveHorizontalBoundary,
      getEffectiveBoundariesForModule,
    ]);

    // Per-element dividers and shelves based on elementConfigs
    // Now uses per-module boundaries
    const elementStructures = React.useMemo(() => {
      // Modules Y
      const modulesY = buildModulesY(h, true, effectiveHorizontalBoundary);

      type MeshDef = {
        key: string;
        position: [number, number, number];
        size: [number, number, number];
      };
      const divs: MeshDef[] = [];
      const shs: MeshDef[] = [];

      let idx = 0;
      modulesY.forEach((m, mIdx) => {
        const moduleKey = m.label ?? "SingleModule";
        const yStartInner = m.yStart + t;
        const yEndInner = m.yEnd - t;
        const _innerH = Math.max(yEndInner - yStartInner, 0);
        const _cy = (yStartInner + yEndInner) / 2;
        // Get blocks for THIS module specifically
        const moduleBoundaries = getEffectiveBoundariesForModule(moduleKey);
        const blocksX = buildBlocksX(
          w,
          moduleBoundaries.length > 0 ? moduleBoundaries : undefined,
        );
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
            const per = DRAWER_HEIGHT + DRAWER_GAP;
            const raiseByBase =
              hasBase && (modulesY.length === 1 || mIdx === 0) ? baseH : 0;
            const drawersYStart = yStartInner + raiseByBase;
            const innerHForDrawers = Math.max(yEndInner - drawersYStart, 0);
            const maxAuto = Math.max(
              0,
              Math.floor((innerHForDrawers + DRAWER_GAP) / per),
            );
            const countFromState = Math.max(
              0,
              Math.floor(extras.drawersCount ?? 0),
            );
            const used =
              countFromState > 0 ? Math.min(countFromState, maxAuto) : maxAuto;
            if (used > 0) {
              const drawersTopY =
                drawersYStart + DRAWER_HEIGHT + (used - 1) * per; // top face of last drawer
              const baseMin = Math.min(
                Math.max(drawersTopY + DRAWER_GAP, yStartInner),
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
    }, [
      w,
      h,
      t,
      d,
      elementConfigs,
      compartmentExtras,
      hasBase,
      baseH,
      effectiveHorizontalBoundary,
      getEffectiveBoundariesForModule,
    ]);

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
            const yAbove = idx > 0 ? sortedShelves[idx - 1].y : t;
            const yBelow =
              idx < sortedShelves.length - 1 ? sortedShelves[idx + 1].y : h - t;
            const minY = yAbove + MIN_DRAG_GAP;
            const maxY = yBelow - MIN_DRAG_GAP;
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
          const minX = prevX + MIN_DRAG_GAP;
          const maxX = nextX - MIN_DRAG_GAP;
          newX = Math.max(minX, Math.min(newX, maxX));

          setCustomDividerPositions((pos) => ({
            ...pos,
            [draggedDividerKey!]: newX,
          }));
        }

        // Handle seam dragging - update LOCAL state (fast, only CarcassFrame re-renders)
        if (seamDragRef.current.index !== null) {
          const { index, moduleKey, startMouseX, baseBoundaries } =
            seamDragRef.current;
          const pixelToWorld = 0.01;
          const startX = baseBoundaries[index];
          let delta = (e.clientX - startMouseX) * pixelToWorld;

          // Calculate constraints based on neighboring boundaries
          const leftEdge = index === 0 ? -w / 2 : baseBoundaries[index - 1];
          const rightEdge =
            index === baseBoundaries.length - 1
              ? w / 2
              : baseBoundaries[index + 1];

          // Target position
          let newX = startX + delta;

          // Constraints: min 10cm segment, max 100cm segment
          const minX = Math.max(
            leftEdge + MIN_SEGMENT,
            rightEdge - MAX_SEGMENT_X,
          );
          const maxX = Math.min(
            rightEdge - MIN_SEGMENT,
            leftEdge + MAX_SEGMENT_X,
          );

          // Clamp to valid range
          newX = Math.max(minX, Math.min(newX, maxX));

          // Update LOCAL state with moduleKey - only CarcassFrame re-renders, not global store
          const newBoundaries = [...baseBoundaries];
          newBoundaries[index] = newX;
          setLocalBoundaries((prev) => ({
            ...prev,
            moduleKey,
            vertical: newBoundaries,
          }));
        }

        // Handle horizontal boundary dragging (Top panel) - update LOCAL state for specific column
        if (hBoundaryDragRef.current.active) {
          const { colIndex, startY, startMouseY } = hBoundaryDragRef.current;
          const pixelToWorld = 0.01;
          // Mouse Y is inverted (down = positive pixels, but up = positive Y in world)
          let delta = (startMouseY - e.clientY) * pixelToWorld;

          // Target Y position
          let newY = startY + delta;

          // Constraints: min 10cm for each module
          const minY = -h / 2 + MIN_SEGMENT; // Bottom module at least 10cm
          const maxY = h / 2 - MIN_SEGMENT; // Top module at least 10cm

          // Clamp to valid range
          newY = Math.max(minY, Math.min(newY, maxY));

          // Update LOCAL state for this specific column
          setLocalBoundaries((prev) => ({
            ...prev,
            columnHorizontal: {
              ...prev.columnHorizontal,
              [colIndex]: newY,
            },
          }));
        }
      }
      function onMouseUp() {
        // Commit vertical boundaries to store on mouse up (use ref for latest value)
        if (seamDragRef.current.index !== null) {
          const { moduleKey } = seamDragRef.current;
          // Commit local vertical boundaries to PER-MODULE store
          if (localBoundariesRef.current.vertical && moduleKey) {
            setModuleVerticalBoundaries(
              moduleKey,
              localBoundariesRef.current.vertical,
            );
          }
          seamDragRef.current.index = null;
          seamDragRef.current.moduleKey = "";
          setIsSeamDragging(false);
        }
        // Commit horizontal boundary to store on mouse up (use ref for latest value)
        if (hBoundaryDragRef.current.active) {
          const { colIndex } = hBoundaryDragRef.current;
          // Commit local horizontal boundary for this specific column to store
          const colBoundary = localBoundariesRef.current.columnHorizontal[colIndex];
          if (colBoundary !== undefined && colBoundary !== null) {
            setColumnHorizontalBoundary(colIndex, colBoundary);
          }
          hBoundaryDragRef.current.active = false;
          hBoundaryDragRef.current.colIndex = 0;
          setIsHBoundaryDragging(false);
        }
        // Clear local boundaries after commit
        setLocalBoundaries({
          moduleKey: null,
          vertical: null,
          columnHorizontal: {},
        });
        setDraggedShelfKey(null);
        setDraggedDividerKey(null);
        setIsDragging(false);
        document.body.style.userSelect = "";
      }
      function onTouchMove(e: TouchEvent) {
        const touch = e.touches[0];
        // Create a synthetic mouse event from touch
        const syntheticEvent = {
          clientX: touch.clientX,
          clientY: touch.clientY,
        } as MouseEvent;
        onMouseMove(syntheticEvent);
      }
      function onTouchEnd() {
        onMouseUp();
      }
      // Add event listeners when any drag is active
      if (
        draggedShelfKey ||
        draggedDividerKey ||
        isSeamDragging ||
        isHBoundaryDragging
      ) {
        window.addEventListener("mousemove", onMouseMove);
        window.addEventListener("mouseup", onMouseUp);
        window.addEventListener("touchmove", onTouchMove, { passive: false });
        window.addEventListener("touchend", onTouchEnd);
      }
      return () => {
        window.removeEventListener("mousemove", onMouseMove);
        window.removeEventListener("mouseup", onMouseUp);
        window.removeEventListener("touchmove", onTouchMove);
        window.removeEventListener("touchend", onTouchEnd);
      };
    }, [
      draggedShelfKey,
      draggedDividerKey,
      isSeamDragging,
      isHBoundaryDragging,
      dragOffset,
      initialShelfY,
      initialDividerX,
      innerWidth,
      w,
      h,
      t,
      dividers,
      customDividerPositions,
      customShelfPositions,
      shelves,
      setModuleVerticalBoundaries,
      setColumnHorizontalBoundary,
      setIsDragging,
      // Note: localBoundaries accessed via ref to avoid re-creating handlers on every drag update
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
          const isSeamPanel = panel.seamIndex !== undefined;
          // Only show drag button on "A" panel of each seam (not both A and B)
          const isSeamAPanel = isSeamPanel && panel.label.includes("A (");
          // Check if this is the Top panel of BottomModule (the split between modules)
          const isTopOfBottomModule =
            panel.label.startsWith("Top") &&
            panel.label.includes("(BottomModule)");
          // Check if this is the Bottom panel of TopModule (also at the split)
          const isBottomOfTopModule =
            panel.label.startsWith("Bottom") &&
            panel.label.includes("(TopModule)");
          // Only show Y-drag when there are 2 modules (height > 200cm)
          const hasMultipleModules = h > TARGET_BOTTOM_HEIGHT;

          // Position comes directly from store via useMemo - no visual delta needed
          // Store is updated on every mouse move, so all panels stay in sync
          const visualPosition: [number, number, number] = [x, y, z];

          return (
            <group key={panel.label}>
              <Panel position={visualPosition} size={panel.size} />
              <Html
                position={[x, y + yOffset, z]}
                center
                distanceFactor={cameraMode === "3D" ? 4 : 8}
                style={{ pointerEvents: "auto" }}
                zIndexRange={[0, 0]}
              >
                <div style={{ position: "relative" }}>
                  <div
                    style={{ display: "flex", alignItems: "center", gap: 4 }}
                  >
                    {showInfoButtons && (
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
                    )}
                    {/* Drag button for Side seam panels */}
                    {isSeamAPanel && (
                      <button
                        style={{
                          width: 20,
                          height: 20,
                          borderRadius: "50%",
                          border: "1px solid #888",
                          background:
                            isSeamDragging &&
                            seamDragRef.current.index === panel.seamIndex
                              ? "#eee"
                              : "#fff",
                          cursor:
                            isSeamDragging &&
                            seamDragRef.current.index === panel.seamIndex
                              ? "grabbing"
                              : "grab",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                        }}
                        onMouseDown={(e) => {
                          e.stopPropagation();
                          e.preventDefault();
                          const moduleKey = panel.moduleKey ?? "SingleModule";
                          // Get or initialize boundaries for THIS module
                          let baseBoundaries =
                            moduleVerticalBoundaries[moduleKey];
                          if (!baseBoundaries || baseBoundaries.length === 0) {
                            // Fall back to old global boundaries or compute defaults
                            baseBoundaries =
                              verticalBoundaries.length > 0
                                ? verticalBoundaries
                                : getDefaultBoundariesX(w);
                            // Initialize this module's boundaries
                            setModuleVerticalBoundaries(
                              moduleKey,
                              baseBoundaries,
                            );
                          }
                          // Store drag state in ref with moduleKey
                          seamDragRef.current = {
                            index: panel.seamIndex!,
                            moduleKey,
                            startMouseX: e.clientX,
                            baseBoundaries: [...baseBoundaries],
                          };
                          setIsSeamDragging(true);
                          setIsDragging(true);
                          document.body.style.userSelect = "none";
                        }}
                      >
                        <img
                          src="/up-down-arrow-icon.png"
                          alt="Drag Seam"
                          style={{
                            width: 14,
                            height: 14,
                            pointerEvents: "none",
                          }}
                        />
                      </button>
                    )}
                    {/* Drag button for Top panel of BottomModule (Y-axis drag) - per column */}
                    {isTopOfBottomModule && hasMultipleModules && (
                      <button
                        style={{
                          width: 20,
                          height: 20,
                          borderRadius: "50%",
                          border: "1px solid #888",
                          background:
                            isHBoundaryDragging &&
                            hBoundaryDragRef.current.colIndex === panel.colIndex
                              ? "#eee"
                              : "#fff",
                          cursor:
                            isHBoundaryDragging &&
                            hBoundaryDragRef.current.colIndex === panel.colIndex
                              ? "grabbing"
                              : "grab",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                        }}
                        onMouseDown={(e) => {
                          e.stopPropagation();
                          e.preventDefault();
                          const colIdx = panel.colIndex ?? 0;
                          // Get current boundary Y for this specific column
                          let currentY = columnHorizontalBoundaries[colIdx] ?? horizontalBoundary;
                          if (currentY === null) {
                            // Compute default: same logic as buildModulesY
                            const defaultBottomH =
                              h - TARGET_BOTTOM_HEIGHT < MIN_TOP_HEIGHT
                                ? h - MIN_TOP_HEIGHT
                                : TARGET_BOTTOM_HEIGHT;
                            currentY = -h / 2 + defaultBottomH;
                          }
                          // Store drag state in ref with column index
                          hBoundaryDragRef.current = {
                            active: true,
                            colIndex: colIdx,
                            startY: currentY,
                            startMouseY: e.clientY,
                          };
                          setIsHBoundaryDragging(true);
                          setIsDragging(true);
                          document.body.style.userSelect = "none";
                        }}
                      >
                        <img
                          src="/up-down-arrow-icon.png"
                          alt="Drag Height"
                          style={{
                            width: 14,
                            height: 14,
                            pointerEvents: "none",
                          }}
                        />
                      </button>
                    )}
                  </div>
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
                      {showInfoButtons && (
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
                      )}
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
                          e.preventDefault();
                          setDraggedDividerKey(divider.id);
                          setDragOffset(e.clientX);
                          setInitialDividerX(
                            customDividerPositions[divider.id] ??
                              divider.position[0],
                          );
                          setIsDragging(true);
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
                      {showInfoButtons && (
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
                      )}
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
                          e.preventDefault();
                          setDraggedShelfKey(shelf.key);
                          setDragOffset(e.clientY);
                          setInitialShelfY(
                            customShelfPositions[shelf.key] ??
                              shelf.position[1],
                          );
                          setIsDragging(true);
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
          // Build element regions exactly like elementLabels
          const blocksX = buildBlocksX(
            w,
            verticalBoundaries.length > 0 ? verticalBoundaries : undefined,
          );
          const modulesY = buildModulesY(h, false, horizontalBoundary);

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
                const per = DRAWER_HEIGHT + DRAWER_GAP;
                const raiseByBase =
                  hasBase && (modulesY.length === 1 || mIdx === 0) ? baseH : 0;
                const drawersYStart = yStartInner + raiseByBase;
                const innerHForDrawers = Math.max(yEndInner - drawersYStart, 0);
                const maxAuto = Math.max(
                  0,
                  Math.floor((innerHForDrawers + DRAWER_GAP) / per),
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
                    ? drawersYStart +
                      DRAWER_HEIGHT +
                      (usedDrawerCount - 1) * per
                    : 0;
                const autoShelfExists =
                  usedDrawerCount > 0 &&
                  usedDrawerCount < maxAuto &&
                  yEndInner - (drawersTopY + DRAWER_GAP) >= t;

                // Vertical divider at center, shortened to end at top of drawers (and above auto shelf if present)
                let yDivFrom = yStartInner;
                if (usedDrawerCount > 0) {
                  const baseFrom =
                    drawersTopY + DRAWER_GAP + (autoShelfExists ? t : 0);
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
                    const y = drawersYStart + DRAWER_HEIGHT / 2 + didx * per;
                    nodes.push(
                      <Panel
                        key={`${letter}-drawer-${didx}`}
                        position={[cx, y, 0]}
                        size={[innerW, DRAWER_HEIGHT, d]}
                      />,
                    );
                  }

                  // Auto-shelf directly above drawers if they don't fill the full available height
                  if (usedDrawerCount > 0 && usedDrawerCount < maxAuto) {
                    const drawersTopY =
                      drawersYStart +
                      DRAWER_HEIGHT +
                      (usedDrawerCount - 1) * per;
                    const shelfPlaneY = drawersTopY + DRAWER_GAP; // bottom plane of the shelf
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
          const blocksX = buildBlocksX(
            w,
            verticalBoundaries.length > 0 ? verticalBoundaries : undefined,
          );
          const modulesY = buildModulesY(h, false, horizontalBoundary);
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
          if (!showDoors) return null;
          if (!doorSelections || Object.keys(doorSelections).length === 0)
            return null;
          // Rebuild element grid (same mapping as labels and menus)
          const blocksX = buildBlocksX(
            w,
            verticalBoundaries.length > 0 ? verticalBoundaries : undefined,
          );
          const modulesY = buildModulesY(h, false, horizontalBoundary);

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
          // Skip rendering if position has NaN values (can happen when center divider is skipped)
          if (position.some((n) => !Number.isFinite(n))) return null;
          return (
            showDimensions && (
              <Html
                key={`comp-label-${i}`}
                position={position}
                center
                distanceFactor={8}
                zIndexRange={[0, 0]}
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
              const blocksX = buildBlocksX(
                w,
                verticalBoundaries.length > 0 ? verticalBoundaries : undefined,
              );
              const segWX = blocksX[0]?.width ?? w;
              const margin = ah * Math.cos(theta);

              for (let i = 0; i < blocksX.length; i++) {
                const start = blocksX[i].start;
                const end = blocksX[i].end;
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
              const modulesY = buildModulesY(h, false, horizontalBoundary);

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
