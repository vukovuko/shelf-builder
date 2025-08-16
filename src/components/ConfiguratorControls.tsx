"use client";

import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { useShelfStore } from "@/lib/store";
import React from "react";
import { DimensionControl } from "./DimensionControl";
import { Button } from "./ui/button";
import materials from "@/data/materials.json";
import { Slider } from "@/components/ui/slider";

export function ConfiguratorControls({
  wardrobeRef,
}: {
  wardrobeRef: React.RefObject<any>;
}) {
  // Download 2D front view as JPG
  const setViewMode = useShelfStore(state => state.setViewMode);
  const viewMode = useShelfStore(state => state.viewMode);
  // For backward compatibility with existing camera mode logic
  const cameraMode = viewMode === "Sizing" ? "2D" : viewMode;
  const setCameraMode = (mode: "2D" | "3D") => setViewMode(mode);
  const setShowEdgesOnly = useShelfStore(state => state.setShowEdgesOnly);
  const showEdgesOnly = useShelfStore(state => state.showEdgesOnly);

  // Download front edges only as JPG
  const handleDownloadFrontEdges = React.useCallback(async () => {
    const prevDims = useShelfStore.getState().showDimensions;
    useShelfStore.getState().setShowDimensions(true);
    setShowEdgesOnly(true);
    useShelfStore.getState().triggerFitToView();
    if (cameraMode !== "2D") {
      setCameraMode("2D");
      await new Promise(resolve => setTimeout(resolve, 300));
    }
    await new Promise(requestAnimationFrame);
    const canvas = document.querySelector("canvas");
    if (!canvas) {
      setShowEdgesOnly(false);
      useShelfStore.getState().setShowDimensions(prevDims);
      return;
    }
    const dataUrl = canvas.toDataURL("image/jpeg", 0.95);
    const link = document.createElement("a");
    link.href = dataUrl;
    link.download = "wardrobe-front-edges.jpg";
    link.click();
    setShowEdgesOnly(false);
    useShelfStore.getState().setShowDimensions(prevDims);
  }, [cameraMode, setCameraMode, setShowEdgesOnly]);

  const handleDownloadFrontView = React.useCallback(async () => {
    const prevDims = useShelfStore.getState().showDimensions;
    useShelfStore.getState().setShowDimensions(true);
    useShelfStore.getState().triggerFitToView();
    if (cameraMode !== "2D") {
      setCameraMode("2D");
      await new Promise(resolve => setTimeout(resolve, 300));
    }
    const canvas = document.querySelector("canvas");
    if (!canvas) {
      useShelfStore.getState().setShowDimensions(prevDims);
      return;
    }
    await new Promise(requestAnimationFrame);
    const dataUrl = canvas.toDataURL("image/jpeg", 0.95);
    const link = document.createElement("a");
    link.href = dataUrl;
    link.download = "wardrobe-front-view.jpg";
    link.click();
    useShelfStore.getState().setShowDimensions(prevDims);
  }, [cameraMode, setCameraMode]);

  // Download 2D technical drawing (only edges, white fill, no shadows)
  const handleDownloadTechnical2D = React.useCallback(async () => {
    const prevDims = useShelfStore.getState().showDimensions;
    useShelfStore.getState().setShowDimensions(true);
    setShowEdgesOnly(true);
    useShelfStore.getState().triggerFitToView();
    if (cameraMode !== "2D") {
      setCameraMode("2D");
      await new Promise(resolve => setTimeout(resolve, 300));
    }
    await new Promise(requestAnimationFrame);
    const canvas = document.querySelector("canvas");
    if (!canvas) {
      setShowEdgesOnly(false);
      useShelfStore.getState().setShowDimensions(prevDims);
      return;
    }
    const dataUrl = canvas.toDataURL("image/jpeg", 0.95);
    const link = document.createElement("a");
    link.href = dataUrl;
    link.download = "wardrobe-technical-2d.jpg";
    link.click();
    setShowEdgesOnly(false);
    useShelfStore.getState().setShowDimensions(prevDims);
  }, [cameraMode, setCameraMode, setShowEdgesOnly]);

  const {
    width,
    height,
    depth,
    setWidth,
    setHeight,
    setDepth,
    numberOfColumns,
  } = useShelfStore();

  // Add these if not already in your store:
  const selectedMaterialId = useShelfStore(state => state.selectedMaterialId);
  const setSelectedMaterialId = useShelfStore(
    state => state.setSelectedMaterialId
  );

  const showDimensions = useShelfStore(state => state.showDimensions);
  const setShowDimensions = useShelfStore(state => state.setShowDimensions);
  // Base (baza) state
  const hasBase = useShelfStore(state => state.hasBase);
  const baseHeight = useShelfStore(state => state.baseHeight);
  const setHasBase = useShelfStore(state => state.setHasBase);
  const setBaseHeight = useShelfStore(state => state.setBaseHeight);

  // State for global info toggle
  const [allInfoShown, setAllInfoShown] = React.useState(false);
  const [showCutList, setShowCutList] = React.useState(false);

  // Additional store reads needed for cut list (top-level to respect Rules of Hooks)
  const elementConfigs = useShelfStore(state => state.elementConfigs);
  const compartmentExtras = useShelfStore(state => state.compartmentExtras);
  const doorSelections = useShelfStore(state => state.doorSelections);

  // Precompute cut list using top-level values to avoid hooks inside conditional modal
  const cutList = React.useMemo(() => {
    try {
      const mat = (materials as any[]).find(
        m => String(m.id) === String(selectedMaterialId as number)
      );
      const pricePerM2 = Number(mat?.price ?? 0);
      const t = (Number(mat?.thickness ?? 18) / 1000) as number; // m
      const doorT = 18 / 1000; // m
      const clearance = 1 / 1000; // 1mm
      const doubleGap = 3 / 1000; // 3mm between double leaves

      const w = width / 100;
      const h = height / 100;
      const d = depth / 100;

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
        const bottomH = h - targetBottomH < minTopH ? h - minTopH : targetBottomH;
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

      type Item = {
        code: string;
        desc: string;
        widthCm: number;
        heightCm: number;
        thicknessMm: number;
        areaM2: number;
        cost: number;
        element: string;
      };

      const items: Item[] = [];

    let idx = 0;
      modulesY.forEach((m, mIdx) => {
        const moduleH = m.yEnd - m.yStart;
        const doorH = Math.max(moduleH - clearance, 0);
        blocksX.forEach(bx => {
          const letter = toLetters(idx);
          const elemW = bx.end - bx.start;
          const innerStartX = bx.start + t;
          const innerEndX = bx.end - t;
          const innerW = Math.max(innerEndX - innerStartX, 0);
          const suffix = `.${mIdx + 1}`;
      const yStartInner = m.yStart + t;
      const yEndInner = m.yEnd - t;
      const innerH = Math.max(yEndInner - yStartInner, 0);

          // Sides
          const sideW = d;
          const sideH = moduleH;
          const sideArea = sideW * sideH;
          items.push({
            code: `A${letter}L${suffix}`,
            desc: `Leva stranica elementa ${letter}${suffix}`,
            widthCm: sideW * 100,
            heightCm: sideH * 100,
            thicknessMm: t * 1000,
            areaM2: sideArea,
            cost: sideArea * pricePerM2,
            element: letter,
          });
          items.push({
            code: `A${letter}D${suffix}`,
            desc: `Desna stranica elementa ${letter}${suffix}`,
            widthCm: sideW * 100,
            heightCm: sideH * 100,
            thicknessMm: t * 1000,
            areaM2: sideArea,
            cost: sideArea * pricePerM2,
            element: letter,
          });

          // Shelves per compartment
          const cfg = elementConfigs[letter] ?? { columns: 1, rowCounts: [0] };
          const cols = Math.max(1, (cfg.columns as number) | 0);
          const xs: number[] = [innerStartX];
          for (let c = 1; c <= cols - 1; c++) xs.push(innerStartX + (innerW * c) / cols);
          xs.push(innerEndX);
          const compWidths = xs.slice(0, -1).map((x0, cIdx) => {
            const x1 = xs[cIdx + 1];
            const left = x0 + (cIdx === 0 ? 0 : t / 2);
            const right = x1 - (cIdx === cols - 1 ? 0 : t / 2);
            return Math.max(right - left, 0);
          });
          let shelfSerial = 0;
          compWidths.forEach((compW, cIdx) => {
            const count = Math.max(0, Math.floor((cfg.rowCounts as number[] | undefined)?.[cIdx] ?? 0));
            for (let s = 0; s < count; s++) {
              shelfSerial += 1;
              const area = compW * d;
              items.push({
                code: `A${letter}P.${shelfSerial}`,
                desc: `Polica ${letter} (komora ${cIdx + 1})`,
                widthCm: compW * 100,
                heightCm: d * 100,
                thicknessMm: t * 1000,
                areaM2: area,
                cost: area * pricePerM2,
                element: letter,
              });
            }
          });

          // Top and Bottom panels per element (like CarcassFrame)
          const innerLenX = Math.max(elemW - 2 * t, 0);
          if (innerLenX > 0) {
            const areaBot = innerLenX * d;
            items.push({
              code: `A${letter}B${suffix}`,
              desc: `Donja ploča ${letter}${suffix}`,
              widthCm: innerLenX * 100,
              heightCm: d * 100,
              thicknessMm: t * 1000,
              areaM2: areaBot,
              cost: areaBot * pricePerM2,
              element: letter,
            });
            const areaTop = innerLenX * d;
            items.push({
              code: `A${letter}G${suffix}`,
              desc: `Gornja ploča ${letter}${suffix}`,
              widthCm: innerLenX * 100,
              heightCm: d * 100,
              thicknessMm: t * 1000,
              areaM2: areaTop,
              cost: areaTop * pricePerM2,
              element: letter,
            });
          }

          // Internal vertical dividers from elementConfigs (between compartments)
          if (cols > 1) {
            // Compute drawers region to shorten divider height (same approach as CarcassFrame)
            const extrasForEl = compartmentExtras[letter as keyof typeof compartmentExtras] as any;
            const drawerH = 10 / 100; // 10cm
            const gap = 1 / 100; // 1cm
            const per = drawerH + gap;
            const raiseByBase = hasBase && (modulesY.length === 1 || mIdx === 0) ? baseHeight / 100 : 0;
            const drawersYStart = yStartInner + raiseByBase;
            const innerHForDrawers = Math.max(yEndInner - drawersYStart, 0);
            const maxAuto = Math.max(0, Math.floor((innerHForDrawers + gap) / per));
            const countFromState = Math.max(0, Math.floor(extrasForEl?.drawersCount ?? 0));
            const usedDrawerCount = extrasForEl?.drawers
              ? countFromState > 0
                ? Math.min(countFromState, maxAuto)
                : maxAuto
              : 0;
            const drawersTopY =
              usedDrawerCount > 0
                ? drawersYStart + drawerH + (usedDrawerCount - 1) * per
                : 0;
            const autoShelfExists =
              usedDrawerCount > 0 && usedDrawerCount < maxAuto && yEndInner - (drawersTopY + gap) >= t;
            let yDivFrom = yStartInner;
            if (usedDrawerCount > 0) {
              const baseFrom = drawersTopY + gap + (autoShelfExists ? t : 0);
              yDivFrom = Math.min(Math.max(baseFrom, yStartInner), yEndInner);
            }
            const hDiv = Math.max(yEndInner - yDivFrom, 0);
            if (hDiv > 0) {
              for (let c = 1; c <= cols - 1; c++) {
                const area = d * hDiv;
                items.push({
                  code: `A${letter}VD.${c}${suffix}`,
                  desc: `Vertikalni divider ${letter} (između komora ${c}/${c + 1})`,
                  widthCm: d * 100,
                  heightCm: hDiv * 100,
                  thicknessMm: t * 1000,
                  areaM2: area,
                  cost: area * pricePerM2,
                  element: letter,
                });
              }
            }
          }

          // Doors
          const sel = doorSelections[letter as keyof typeof doorSelections] as any;
          if (sel && sel !== "none") {
            const totalAvailW = Math.max(elemW - clearance, 0);
            if (sel === "double" || sel === "doubleMirror") {
              const leafW = Math.max((totalAvailW - doubleGap) / 2, 0);
              const area = leafW * doorH;
              items.push({
                code: `A${letter}V.L${suffix}`,
                desc: `Vrata leva ${letter}${suffix}`,
                widthCm: leafW * 100,
                heightCm: doorH * 100,
                thicknessMm: doorT * 1000,
                areaM2: area,
                cost: area * pricePerM2,
                element: letter,
              });
              items.push({
                code: `A${letter}V.D${suffix}`,
                desc: `Vrata desna ${letter}${suffix}`,
                widthCm: leafW * 100,
                heightCm: doorH * 100,
                thicknessMm: doorT * 1000,
                areaM2: area,
                cost: area * pricePerM2,
                element: letter,
              });
            } else {
              const leafW = totalAvailW;
              const area = leafW * doorH;
              const isLeft = sel === "left" || sel === "leftMirror";
              const codeSuffix = isLeft ? "L" : sel === "right" || sel === "rightMirror" ? "D" : "";
              items.push({
                code: `A${letter}V.${codeSuffix}${suffix}`,
                desc: `Vrata ${isLeft ? "leva" : codeSuffix === "D" ? "desna" : "jednokrilna"} ${letter}${suffix}`,
                widthCm: leafW * 100,
                heightCm: doorH * 100,
                thicknessMm: doorT * 1000,
                areaM2: area,
                cost: area * pricePerM2,
                element: letter,
              });
            }
          }

          // Extras center vertical divider (from Extras menu)
          {
            const extras = compartmentExtras[letter as keyof typeof compartmentExtras] as any;
            if (extras?.verticalDivider) {
              const drawerH = 10 / 100;
              const gap = 1 / 100;
              const per = drawerH + gap;
              const raiseByBase = hasBase && (modulesY.length === 1 || mIdx === 0) ? baseHeight / 100 : 0;
              const drawersYStart = yStartInner + raiseByBase;
              const innerHForDrawers = Math.max(yEndInner - drawersYStart, 0);
              const maxAuto = Math.max(0, Math.floor((innerHForDrawers + gap) / per));
              const countFromState = Math.max(0, Math.floor(extras?.drawersCount ?? 0));
              const usedDrawerCount = extras?.drawers
                ? countFromState > 0
                  ? Math.min(countFromState, maxAuto)
                  : maxAuto
                : 0;
              const drawersTopY =
                usedDrawerCount > 0
                  ? drawersYStart + drawerH + (usedDrawerCount - 1) * per
                  : 0;
              const autoShelfExists =
                usedDrawerCount > 0 && usedDrawerCount < maxAuto && yEndInner - (drawersTopY + gap) >= t;
              let yDivFrom = yStartInner;
              if (usedDrawerCount > 0) {
                const baseFrom = drawersTopY + gap + (autoShelfExists ? t : 0);
                yDivFrom = Math.min(Math.max(baseFrom, yStartInner), yEndInner);
              }
              const hDiv = Math.max(yEndInner - yDivFrom, 0);
              if (hDiv > 0) {
                const area = d * hDiv;
                items.push({
                  code: `A${letter}VD.C${suffix}`,
                  desc: `Vertikalni divider (srednji) ${letter}${suffix}`,
                  widthCm: d * 100,
                  heightCm: hDiv * 100,
                  thicknessMm: t * 1000,
                  areaM2: area,
                  cost: area * pricePerM2,
                  element: letter,
                });
              }
            }
          }

          // Drawers
          const extras = compartmentExtras[letter as keyof typeof compartmentExtras] as any;
          if (extras?.drawers) {
            const drawerH = 10 / 100;
            const gap = 1 / 100;
            const per = drawerH + gap;
            const yStartInner = m.yStart + t;
            const yEndInner = m.yEnd - t;
            const raiseByBase = hasBase && (modulesY.length === 1 || mIdx === 0) ? baseHeight / 100 : 0;
            const drawersYStart = yStartInner + raiseByBase;
            const innerHForDrawers = Math.max(yEndInner - drawersYStart, 0);
            const maxAuto = Math.max(0, Math.floor((innerHForDrawers + gap) / per));
            const countFromState = Math.max(0, Math.floor(extras.drawersCount ?? 0));
            const used = countFromState > 0 ? Math.min(countFromState, maxAuto) : maxAuto;
            for (let i = 0; i < used; i++) {
              const area = innerW * drawerH;
              items.push({
                code: `A${letter}F.${i + 1}${suffix}`,
                desc: `Fioka ${letter}${suffix}`,
                widthCm: innerW * 100,
                heightCm: drawerH * 100,
                thicknessMm: t * 1000,
                areaM2: area,
                cost: area * pricePerM2,
                element: letter,
              });
            }

            // Auto-shelf directly above drawers if they don't fill full available height
            if (used > 0 && used < maxAuto) {
              const drawersTopY = drawersYStart + drawerH + (used - 1) * per;
              const shelfPlaneY = drawersTopY + gap; // bottom plane of the shelf
              const remaining = yEndInner - shelfPlaneY;
              if (remaining >= t) {
                const area = innerW * d;
                items.push({
                  code: `A${letter}P.A${suffix}`,
                  desc: `Polica iznad fioka ${letter}${suffix}`,
                  widthCm: innerW * 100,
                  heightCm: d * 100,
                  thicknessMm: t * 1000,
                  areaM2: area,
                  cost: area * pricePerM2,
                  element: letter,
                });
              }
            }
          }

          idx += 1;
        });
      });

      const totalArea = items.reduce((a, b) => a + b.areaM2, 0);
      const totalCost = items.reduce((a, b) => a + b.cost, 0);
      const grouped = items.reduce((acc: Record<string, Item[]>, it) => {
        (acc[it.element] = acc[it.element] || []).push(it);
        return acc;
      }, {});

      return { items, grouped, totalArea, totalCost, pricePerM2 };
    } catch (e) {
      return { items: [], grouped: {}, totalArea: 0, totalCost: 0, pricePerM2: 0 } as {
        items: any[];
        grouped: Record<string, any[]>;
        totalArea: number;
        totalCost: number;
        pricePerM2: number;
      };
    }
  }, [
    width,
    height,
    depth,
    selectedMaterialId,
    elementConfigs,
    compartmentExtras,
    hasBase,
    baseHeight,
    doorSelections,
  ]);

  // Number formatter: 2 decimals consistently
  const fmt2 = React.useCallback(
    (n: number) =>
      Number(n ?? 0).toLocaleString(undefined, {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      }),
    []
  );

  // Reset info button state if wardrobe structure changes
  const rowCounts = useShelfStore(state => state.rowCounts);
  React.useEffect(() => {
    setAllInfoShown(false);
    // Always reset overlays to hidden on structure change
    if (wardrobeRef?.current?.toggleAllInfo) {
      wardrobeRef.current.toggleAllInfo(false);
    }
  }, [numberOfColumns, JSON.stringify(rowCounts)]);

  const handleToggleAllInfo = () => {
    if (wardrobeRef?.current?.toggleAllInfo) {
      wardrobeRef.current.toggleAllInfo(!allInfoShown);
      setAllInfoShown(prev => !prev);
    }
  };

  return (
    <>
      <Accordion
        type="single"
        collapsible
        defaultValue="item-1"
        className="w-full"
      >
        <AccordionItem value="item-1" className="border-border">
          <AccordionTrigger className="text-base font-bold hover:no-underline">
            1. Define exterior dimensions
          </AccordionTrigger>
          <AccordionContent className="space-y-6 pt-4">
            <DimensionControl
              label="Width"
              value={width}
              setValue={setWidth}
              min={50}
              max={400}
              step={1}
            />
            <DimensionControl
              label="Height"
              value={height}
              setValue={setHeight}
              min={50}
              max={280}
              step={1}
            />
            <DimensionControl
              label="Depth"
              value={depth}
              setValue={setDepth}
              min={20}
              max={100}
              step={1}
            />
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="item-2" className="border-border">
          <AccordionTrigger className="text-base font-bold hover:no-underline">
            2. Columns & Compartments
          </AccordionTrigger>
          <AccordionContent className="space-y-4 pt-4">
            {/* Per-element selection and controls */}
            {(() => {
              // Compute elements (letters) in the same order as CarcassFrame: bottom-to-top, left-to-right
              const w = useShelfStore.getState().width / 100;
              const h = useShelfStore.getState().height / 100;
              const maxSegX = 100 / 100;
              const nBlocksX = Math.max(1, Math.ceil(w / maxSegX));
              const letters: string[] = [];
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
              const minTopH = 10 / 100;
              const targetBottomH = 200 / 100;
              const hasSplitY = h > 200 / 100; // split when > 200cm
              const topH = hasSplitY
                ? h - targetBottomH < minTopH
                  ? minTopH
                  : h - targetBottomH
                : 0;
              const nModulesY = hasSplitY ? 2 : 1;
              const totalElements = nBlocksX * nModulesY;
              for (let i = 0; i < totalElements; i++)
                letters.push(toLetters(i));

              const selectedElementKey = useShelfStore(
                state => state.selectedElementKey
              );
              const setSelectedElementKey = useShelfStore(
                state => state.setSelectedElementKey
              );
              const elementConfigs = useShelfStore(
                state => state.elementConfigs
              );
              const setElementColumns = useShelfStore(
                state => state.setElementColumns
              );
              const setElementRowCount = useShelfStore(
                state => state.setElementRowCount
              );

              return (
                <div className="space-y-4">
                  <div className="flex flex-wrap gap-2 items-center">
                    <span className="text-sm text-muted-foreground">
                      Element:
                    </span>
                    {letters.map((ltr, idx) => (
                      <Button
                        key={ltr}
                        variant={
                          selectedElementKey === ltr ? "default" : "outline"
                        }
                        onClick={() => setSelectedElementKey(ltr)}
                        className="px-2 py-1 h-8  transition-colors"
                      >
                        {ltr}
                      </Button>
                    ))}
                  </div>

                  {selectedElementKey && (
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-sm">Compartments (vertical)</span>
                        <span className="text-xs text-muted-foreground">
                          {elementConfigs[selectedElementKey]?.columns ?? 1}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="icon"
                          onClick={() => {
                            const curr =
                              elementConfigs[selectedElementKey]?.columns ?? 1;
                            setElementColumns(
                              selectedElementKey,
                              Math.max(curr - 1, 1)
                            );
                          }}
                          className="px-2"
                        >
                          –
                        </Button>
                        <Slider
                          min={1}
                          max={8}
                          step={1}
                          value={[
                            elementConfigs[selectedElementKey]?.columns ?? 1,
                          ]}
                          onValueChange={([val]) =>
                            setElementColumns(selectedElementKey, val)
                          }
                          className="flex-1"
                        />
                        <Button
                          variant="outline"
                          size="icon"
                          onClick={() => {
                            const curr =
                              elementConfigs[selectedElementKey]?.columns ?? 1;
                            setElementColumns(
                              selectedElementKey,
                              Math.min(curr + 1, 8)
                            );
                          }}
                          className="px-2"
                        >
                          +
                        </Button>
                      </div>

                      {/* Shelf sliders per compartment */}
                      <div className="space-y-2">
                        {Array.from({
                          length:
                            elementConfigs[selectedElementKey]?.columns ?? 1,
                        }).map((_, idx) => {
                          const count =
                            elementConfigs[selectedElementKey]?.rowCounts?.[
                              idx
                            ] ?? 0;
                          return (
                            <div
                              key={idx}
                              className="flex items-center space-x-2"
                            >
                              <span className="text-xs text-muted-foreground">
                                Shelves in Comp {idx + 1}
                              </span>
                              <Button
                                variant="outline"
                                size="icon"
                                onClick={() =>
                                  setElementRowCount(
                                    selectedElementKey,
                                    idx,
                                    Math.max(count - 1, 0)
                                  )
                                }
                                disabled={count <= 0}
                                className="px-2"
                              >
                                –
                              </Button>
                              <Slider
                                min={0}
                                max={10}
                                step={1}
                                value={[count]}
                                onValueChange={([val]) =>
                                  setElementRowCount(
                                    selectedElementKey,
                                    idx,
                                    val
                                  )
                                }
                                className="flex-1"
                              />
                              <Button
                                variant="outline"
                                size="icon"
                                onClick={() =>
                                  setElementRowCount(
                                    selectedElementKey,
                                    idx,
                                    Math.min(count + 1, 10)
                                  )
                                }
                                disabled={count >= 10}
                                className="px-2"
                              >
                                +
                              </Button>
                              <span className="text-xs w-10 text-right">
                                {count} shelves
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              );
            })()}
          </AccordionContent>
        </AccordionItem>

        {/* 4. Base (Baza) */}
        <AccordionItem value="item-4" className="border-border">
          <AccordionTrigger className="text-base font-bold hover:no-underline">
            4. Base (Baza)
          </AccordionTrigger>
          <AccordionContent className="space-y-4 pt-4">
            <div className="flex items-center gap-2">
              <input
                id="chk-base"
                type="checkbox"
                className="h-4 w-4 accent-primary"
                checked={hasBase}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  setHasBase(e.target.checked)
                }
              />
              <label htmlFor="chk-base" className="text-sm select-none">
                Uključi bazu (donja pregrada)
              </label>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm">Visina baze</span>
                <span className="text-xs text-muted-foreground">
                  {baseHeight} cm
                </span>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => setBaseHeight(Math.max(baseHeight - 1, 0))}
                  disabled={!hasBase}
                  className="px-2"
                >
                  –
                </Button>
                <Slider
                  min={0}
                  max={15}
                  step={1}
                  value={[baseHeight]}
                  onValueChange={([val]) => setBaseHeight(val)}
                  disabled={!hasBase}
                  className="flex-1"
                />
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => setBaseHeight(Math.min(baseHeight + 1, 20))}
                  disabled={!hasBase}
                  className="px-2"
                >
                  +
                </Button>
              </div>
            </div>
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="item-3" className="border-border">
          <AccordionTrigger className="text-base font-bold hover:no-underline">
            3. Choose material
          </AccordionTrigger>
          <AccordionContent className="space-y-6 pt-4">
            {/* Materijal Korpusa */}
            <div>
              <h4 className="text-sm font-semibold mb-2">
                Materijal Korpusa (10–25mm)
              </h4>
              <div className="grid grid-cols-3 gap-4">
                {materials
                  .filter(m => m.thickness >= 10 && m.thickness <= 25)
                  .map(material => (
                    <div
                      key={material.id}
                      className="flex flex-col items-center"
                    >
                      <button
                        className={`rounded-lg border-2 ${
                          selectedMaterialId === material.id
                            ? "border-primary"
                            : "border-transparent"
                        } hover:border-primary h-24 w-full bg-cover bg-center`}
                        style={{ backgroundImage: `url(${material.img})` }}
                        onClick={() => setSelectedMaterialId(material.id)}
                        title={material.name}
                      >
                        <span className="sr-only">{material.name}</span>
                      </button>
                      <span className="text-sm mt-1 text-center">
                        {material.name}
                      </span>
                    </div>
                  ))}
              </div>
            </div>

            {/* Materijal Leđa */}
            <div>
              <h4 className="text-sm font-semibold mb-2">
                Materijal Leđa (5mm)
              </h4>
              <div className="grid grid-cols-3 gap-4">
                {materials
                  .filter(m => m.thickness === 5) // for 5mm
                  .map(material => (
                    <div
                      key={material.id}
                      className="flex flex-col items-center"
                    >
                      <button
                        className="rounded-lg border-2 border-transparent hover:border-primary h-24 w-full bg-cover bg-center"
                        style={{ backgroundImage: `url(${material.img})` }}
                        // You can add a separate setter for back material if needed
                        onClick={() =>
                          console.log("Odabrani materijal leđa:", material)
                        }
                        title={material.name}
                      >
                        <span className="sr-only">{material.name}</span>
                      </button>
                      <span className="text-sm mt-1 text-center">
                        {material.name}
                      </span>
                    </div>
                  ))}
              </div>
            </div>
          </AccordionContent>
        </AccordionItem>
        {/* 5. Extras */}
        <AccordionItem value="item-5" className="border-border">
          <AccordionTrigger className="text-base font-bold hover:no-underline">
            5. Extras
          </AccordionTrigger>
          <AccordionContent className="space-y-4 pt-4">
            {(() => {
              // Prava reaktivna veza na Zustand store
              const extrasMode = useShelfStore(state => state.extrasMode);
              const setExtrasMode = useShelfStore(state => state.setExtrasMode);
              const selectedCompartmentKey = useShelfStore(
                state => state.selectedCompartmentKey
              );
              const setSelectedCompartmentKey = useShelfStore(
                state => state.setSelectedCompartmentKey
              );
              const compartmentExtras = useShelfStore(
                state => state.compartmentExtras
              );
              const toggleCompVerticalDivider = useShelfStore(
                state => state.toggleCompVerticalDivider
              );
              const toggleCompDrawers = useShelfStore(
                state => state.toggleCompDrawers
              );
              const toggleCompRod = useShelfStore(state => state.toggleCompRod);
              const toggleCompLed = useShelfStore(state => state.toggleCompLed);

              // Prikaz svih slova (A, B, C, ...) prema broju elemenata na crtežu
              // Identicno kao u CarcassFrame elementLabels: blokovi po 100cm (X) i moduli po visini (Y)
              const width = useShelfStore(state => state.width);
              const height = useShelfStore(state => state.height);
              const w = width / 100;
              const h = height / 100;
              const maxSegX = 100 / 100;
              const nBlocksX = Math.max(1, Math.ceil(w / maxSegX));
              const hasSplitY = h > 200 / 100;
              const nModulesY = hasSplitY ? 2 : 1;
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
              const allKeys = Array.from(
                { length: nBlocksX * nModulesY },
                (_, i) => toLetters(i)
              );

              // Prikaz stanja za selektovani element
              const extras = selectedCompartmentKey
                ? compartmentExtras[selectedCompartmentKey] || {}
                : {};

              return (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Selection mode</span>
                    <Button
                      variant={extrasMode ? "default" : "outline"}
                      onClick={() => setExtrasMode(!extrasMode)}
                      className="h-8 px-3"
                    >
                      {extrasMode ? "On" : "Off"}
                    </Button>
                  </div>

                  {/* Element selection row for extras */}
                  <div className="flex flex-wrap gap-2 items-center mb-2">
                    <span className="text-sm text-muted-foreground">
                      Element:
                    </span>
                    {allKeys.map(ltr => (
                      <Button
                        key={ltr}
                        variant={
                          selectedCompartmentKey === ltr ? "default" : "outline"
                        }
                        onClick={() => setSelectedCompartmentKey(ltr)}
                        className="px-2 py-1 h-8  transition-colors"
                      >
                        {ltr}
                      </Button>
                    ))}
                  </div>
                  {!selectedCompartmentKey ? (
                    <div className="text-sm text-muted-foreground">
                      Izaberi element klikom na slovo iznad, pa dodaj dodatke.
                    </div>
                  ) : (
                    <div className="space-y-3">
                      <div className="text-sm">
                        Odabrani: {selectedCompartmentKey}
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <Button
                          variant={
                            extras.verticalDivider ? "default" : "outline"
                          }
                          onClick={() =>
                            toggleCompVerticalDivider(selectedCompartmentKey)
                          }
                          className=" transition-colors"
                        >
                          {extras.verticalDivider ? "✔ " : ""}+ Vertikalni
                          divider
                        </Button>
                        {/* Drawers button + count selector together */}
                        <div className="flex items-center gap-2">
                          <Button
                            variant={extras.drawers ? "default" : "outline"}
                            onClick={() =>
                              toggleCompDrawers(selectedCompartmentKey)
                            }
                            className=" transition-colors"
                          >
                            {extras.drawers ? "✔ " : ""}+ Fioke
                          </Button>
                          <select
                            className="h-9 px-2 border rounded"
                            disabled={
                              !selectedCompartmentKey || !extras.drawers
                            }
                            value={extras.drawersCount ?? 0}
                            onChange={e => {
                              const val = parseInt(e.target.value, 10) || 0;
                              useShelfStore
                                .getState()
                                .setCompDrawersCount(
                                  selectedCompartmentKey!,
                                  val
                                );
                            }}
                          >
                            {(() => {
                              const width = useShelfStore.getState().width;
                              const height = useShelfStore.getState().height;
                              const selectedMaterialId =
                                useShelfStore.getState()
                                  .selectedMaterialId as number;
                              const mat = (materials as any[]).find(
                                m => String(m.id) === String(selectedMaterialId)
                              );
                              const thicknessMm = mat?.thickness ?? 18; // mm
                              const t = thicknessMm / 1000; // world units (m)
                              const w = width / 100;
                              const h = height / 100;
                              const maxSegX = 100 / 100;
                              const nBlocksX = Math.max(
                                1,
                                Math.ceil(w / maxSegX)
                              );
                              const segWX = w / nBlocksX;
                              const targetBottomH = 200 / 100;
                              const minTopH = 10 / 100;
                              const modulesY: {
                                yStart: number;
                                yEnd: number;
                              }[] = [];
                              if (h > 200 / 100) {
                                const yStartBottom = -h / 2;
                                const bottomH =
                                  h - targetBottomH < minTopH
                                    ? h - minTopH
                                    : targetBottomH;
                                const yEndBottom = yStartBottom + bottomH;
                                const yStartTop = yEndBottom;
                                const yEndTop = h / 2;
                                modulesY.push({
                                  yStart: yStartBottom,
                                  yEnd: yEndBottom,
                                });
                                modulesY.push({
                                  yStart: yStartTop,
                                  yEnd: yEndTop,
                                });
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
                              const blocksX = Array.from(
                                { length: nBlocksX },
                                (_, i) => {
                                  const start = -w / 2 + i * segWX;
                                  const end = start + segWX;
                                  return { start, end };
                                }
                              );
                              let idx = 0;
                              let innerHForDrawers = 0;
                              let found = false;
                              modulesY.forEach((m, mIdx) => {
                                blocksX.forEach(bx => {
                                  const letter = toLetters(idx);
                                  if (
                                    !found &&
                                    letter === selectedCompartmentKey
                                  ) {
                                    const yStartInner = m.yStart + t;
                                    const yEndInner = m.yEnd - t;
                                    const raiseByBase =
                                      hasBase &&
                                      (modulesY.length === 1 || mIdx === 0)
                                        ? baseHeight / 100
                                        : 0;
                                    const drawersYStart =
                                      yStartInner + raiseByBase;
                                    innerHForDrawers = Math.max(
                                      yEndInner - drawersYStart,
                                      0
                                    );
                                    found = true;
                                  }
                                  idx += 1;
                                });
                              });
                              const drawerH = 10 / 100; // 10cm
                              const gap = 1 / 100; // 1cm
                              const maxCount = Math.max(
                                0,
                                Math.floor(
                                  (innerHForDrawers + gap) / (drawerH + gap)
                                )
                              );
                              const current = extras.drawersCount ?? 0;
                              const options = [] as number[];
                              for (let i = 0; i <= maxCount; i++)
                                options.push(i);
                              if (current > maxCount) options.push(current);
                              return options.map(n => (
                                <option key={n} value={n}>
                                  {n}
                                </option>
                              ));
                            })()}
                          </select>
                        </div>
                        <Button
                          variant={extras.rod ? "default" : "outline"}
                          onClick={() => toggleCompRod(selectedCompartmentKey)}
                          className=" transition-colors"
                        >
                          {extras.rod ? "✔ " : ""}+ Šipka za ofingere
                        </Button>
                        <Button
                          variant={extras.led ? "default" : "outline"}
                          onClick={() => toggleCompLed(selectedCompartmentKey)}
                          className=" transition-colors"
                        >
                          {extras.led ? "✔ " : ""}LED rasveta
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })()}
          </AccordionContent>
        </AccordionItem>
        {/* 6. Doors */}
        <AccordionItem value="item-6" className="border-border">
          <AccordionTrigger className="text-base font-bold hover:no-underline">
            6. Doors
          </AccordionTrigger>
          <AccordionContent className="space-y-4 pt-4">
            {(() => {
              const width = useShelfStore(state => state.width);
              const height = useShelfStore(state => state.height);
              const w = width / 100;
              const h = height / 100;
              const maxSegX = 100 / 100;
              const nBlocksX = Math.max(1, Math.ceil(w / maxSegX));
              const hasSplitY = h > 200 / 100;
              const nModulesY = hasSplitY ? 2 : 1;
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
              const allKeys = Array.from(
                { length: nBlocksX * nModulesY },
                (_, i) => toLetters(i)
              );

              const selectedDoorElementKey = useShelfStore(
                state => state.selectedDoorElementKey
              );
              const setSelectedDoorElementKey = useShelfStore(
                state => state.setSelectedDoorElementKey
              );
              const doorSelections = useShelfStore(
                state => state.doorSelections
              );
              const setDoorOption = useShelfStore(state => state.setDoorOption);

              const options: { key: string; label: string }[] = [
                { key: "none", label: "Bez vrata" },
                { key: "left", label: "Leva vrata" },
                { key: "right", label: "Desna vrata" },
                { key: "double", label: "Dupla vrata" },
                { key: "leftMirror", label: "Leva vrata sa ogledalom" },
                { key: "rightMirror", label: "Desna vrata sa ogledalom" },
                { key: "doubleMirror", label: "Dupla vrata sa ogledalom" },
                { key: "drawerStyle", label: "Vrata kao fioka" },
              ];

              return (
                <div className="space-y-4">
                  <div className="flex flex-wrap gap-2 items-center mb-1">
                    <span className="text-sm text-muted-foreground">
                      Element:
                    </span>
                    {allKeys.map(ltr => (
                      <Button
                        key={ltr}
                        variant={
                          selectedDoorElementKey === ltr ? "default" : "outline"
                        }
                        onClick={() => setSelectedDoorElementKey(ltr)}
                        className="px-2 py-1 h-8 transition-colors"
                      >
                        {ltr}
                      </Button>
                    ))}
                  </div>

                  {!selectedDoorElementKey ? (
                    <div className="text-sm text-muted-foreground">
                      Izaberi element klikom na slovo iznad, pa izaberi tip vrata.
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <div className="text-sm">
                        Odabrani: {selectedDoorElementKey}
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        {options.map(opt => {
                          const curr = doorSelections[selectedDoorElementKey];
                          const isSel = curr === (opt.key as any);
                          return (
                            <Button
                              key={opt.key}
                              variant={isSel ? "default" : "outline"}
                              onClick={() =>
                                setDoorOption(selectedDoorElementKey, opt.key as any)
                              }
                              className="text-sm"
                            >
                              {isSel ? "✔ " : ""}
                              {opt.label}
                            </Button>
                          );
                        })}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        (Posle ćemo definisati ponašanje svake opcije.)
                      </div>
                    </div>
                  )}
                </div>
              );
            })()}
          </AccordionContent>
        </AccordionItem>
        {/* Global Show/Hide Info Button */}
        <div className="flex flex-col items-center gap-3 mt-6">
          <Button variant="outline" onClick={handleToggleAllInfo}>
            {allInfoShown ? "Hide All Info" : "Show All Info"}
          </Button>
          <Button
            variant="outline"
            onClick={() => setShowDimensions(!showDimensions)}
          >
            {showDimensions ? "Hide Dimensions" : "Show Dimensions"}
          </Button>
          <Button variant="outline" onClick={handleDownloadFrontView}>
            Download Front View (JPG)
          </Button>
          <Button variant="outline" onClick={handleDownloadFrontEdges}>
            Download Front Edges (JPG)
          </Button>
          <Button variant="outline" onClick={handleDownloadTechnical2D}>
            Download 2D Technical (JPG)
          </Button>
          <Button variant="default" onClick={() => setShowCutList(true)}>
            Tabela ploča
          </Button>
        </div>
      </Accordion>

      {/* Bottom summary bar */}
      <div className="mt-4 w-full bg-green-600 text-white h-[50px] flex items-center justify-between px-3 rounded">
        <span className="text-sm font-medium">
          Ukupna kvadratura: {fmt2(cutList.totalArea)} m²
        </span>
        <span className="text-sm font-semibold">
          Ukupna cena: {fmt2(cutList.totalCost)}
        </span>
      </div>

      {/* Cut List Modal */}
      {showCutList && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div
            className="absolute inset-0 bg-black/50"
            onClick={() => setShowCutList(false)}
          />
          <div className="relative bg-white dark:bg-neutral-900 rounded-lg shadow-xl w-[92vw] max-w-6xl max-h-[85vh] overflow-auto p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-lg font-semibold">Tabela ploča (Cut list)</h3>
              <Button variant="outline" onClick={() => setShowCutList(false)}>
                Zatvori
              </Button>
            </div>
            <div className="space-y-4">
              <div className="text-sm text-muted-foreground">
                Cena materijala (po m²): {fmt2(cutList.pricePerM2)}
              </div>
              {Object.keys(cutList.grouped).map(letter => (
                <div key={letter} className="space-y-2">
                  <div className="font-semibold">Element {letter}</div>
                  <div className="overflow-auto">
                    <table className="w-full text-sm border-collapse">
                      <thead>
                        <tr className="border-b">
                          <th className="text-left py-1 pr-2">Oznaka</th>
                          <th className="text-left py-1 pr-2">Opis</th>
                          <th className="text-right py-1 pr-2">Širina (cm)</th>
                          <th className="text-right py-1 pr-2">Visina (cm)</th>
                          <th className="text-right py-1 pr-2">Debljina (mm)</th>
                          <th className="text-right py-1 pr-2">Kvadratura (m²)</th>
                          <th className="text-right py-1 pr-2">Cena</th>
                        </tr>
                      </thead>
                      <tbody>
            {cutList.grouped[letter].map((it: any, i: number) => (
                          <tr key={`${it.code}-${i}`} className="border-b last:border-0">
                            <td className="py-1 pr-2 whitespace-nowrap">{it.code}</td>
                            <td className="py-1 pr-2">{it.desc}</td>
              <td className="py-1 pr-2 text-right">{fmt2(it.widthCm)}</td>
              <td className="py-1 pr-2 text-right">{fmt2(it.heightCm)}</td>
              <td className="py-1 pr-2 text-right">{fmt2(it.thicknessMm)}</td>
              <td className="py-1 pr-2 text-right">{fmt2(it.areaM2)}</td>
              <td className="py-1 pr-2 text-right">{fmt2(it.cost)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              ))}
              <div className="flex justify-end gap-8 text-sm font-semibold">
        <div>Ukupna kvadratura: {fmt2(cutList.totalArea)} m²</div>
        <div>Ukupna cena: {fmt2(cutList.totalCost)}</div>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

// Example: Top-right controls (e.g. in Scene.tsx or AppBar.tsx)
export function TopRightControls() {
  const viewMode = useShelfStore(state => state.viewMode);
  const setViewMode = useShelfStore(state => state.setViewMode);
  // For backward compatibility with existing camera mode logic
  const cameraMode = viewMode === "Sizing" ? "2D" : viewMode;
  const setCameraMode = (mode: "2D" | "3D") => setViewMode(mode);
  const showDimensions = useShelfStore(state => state.showDimensions);
  const setShowDimensions = useShelfStore(state => state.setShowDimensions);

  return (
    <div
      style={{
        position: "absolute",
        top: 16,
        right: 16,
        display: "flex",
        gap: 8,
        zIndex: 10,
      }}
    >
      <button
        className={`px-3 py-1 rounded ${
          cameraMode === "2D" ? "bg-primary text-white" : "bg-white border"
        }`}
        onClick={() => setCameraMode("2D")}
      >
        2D
      </button>
      <button
        className={`px-3 py-1 rounded ${
          cameraMode === "3D" ? "bg-primary text-white" : "bg-white border"
        }`}
        onClick={() => setCameraMode("3D")}
      >
        3D
      </button>
      <button
        className={`px-3 py-1 rounded ${
          showDimensions ? "bg-primary text-white" : "bg-white border"
        }`}
        onClick={() => setShowDimensions(!showDimensions)}
      >
        {showDimensions ? "Hide Dimensions" : "Show Dimensions"}
      </button>
    </div>
  );
}
