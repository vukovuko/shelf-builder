"use client";

import jsPDF from "jspdf";
import React, {
  useEffect,
  useRef,
  useState,
  useCallback,
  useMemo,
} from "react";
import Link from "next/link";
import {
  ArrowLeft,
  Calendar,
  User,
  Ruler,
  Download,
  FileText,
  FileSpreadsheet,
  Pencil,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { calculateCutList } from "@/lib/calcCutList";
import { exportCutListAsCsv } from "@/lib/exportCsv";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Scene } from "@/components/Scene";
import { ViewModeToggle } from "@/components/ViewModeToggle";
import {
  useShelfStore,
  parseSubCompKey,
  type Material,
  type ShelfState,
} from "@/lib/store";
import { applyWardrobeSnapshot } from "@/lib/serializeWardrobe";
import {
  DRAWER_HEIGHT_CM,
  DRAWER_GAP_CM,
  MAX_SEGMENT_X_CM,
  TARGET_BOTTOM_HEIGHT_CM,
  MIN_TOP_HEIGHT_CM,
} from "@/lib/wardrobe-constants";

interface CutListItem {
  code: string;
  desc: string;
  widthCm: number;
  heightCm: number;
  thicknessMm: number;
  areaM2: number;
  cost: number;
  element: string;
  materialType: "korpus" | "front" | "back";
}

interface CutList {
  items: CutListItem[];
  pricePerM2: number;
  frontPricePerM2: number;
  backPricePerM2: number;
  totalArea: number;
  totalCost: number;
}

interface LinkedOrder {
  id: string;
  orderNumber: number;
  status: string;
}

interface WardrobePreviewClientProps {
  wardrobe: {
    id: string;
    name: string;
    data: Record<string, unknown>;
    thumbnail: string | null;
    cutList: CutList | null;
    createdAt: string;
    updatedAt: string;
    userName: string | null;
    userEmail: string | null;
    isModel: boolean | null;
  };
  materials: Material[];
  linkedOrders: LinkedOrder[];
}

function CutListDisplay({ cutList }: { cutList: CutList }) {
  // Group items by element
  const groupedItems = cutList.items.reduce(
    (acc, item) => {
      if (!acc[item.element]) {
        acc[item.element] = [];
      }
      acc[item.element].push(item);
      return acc;
    },
    {} as Record<string, CutListItem[]>,
  );

  const elements = Object.keys(groupedItems).sort();

  const formatPrice = (price: number) =>
    new Intl.NumberFormat("sr-RS").format(Math.round(price));

  return (
    <div className="space-y-4">
      {/* Summary */}
      <div className="flex flex-wrap gap-4 text-sm">
        <div>
          <span className="text-muted-foreground">Ukupno ploča: </span>
          <span className="font-medium">{cutList.items.length}</span>
        </div>
        <div>
          <span className="text-muted-foreground">Ukupna površina: </span>
          <span className="font-medium">{cutList.totalArea.toFixed(2)} m²</span>
        </div>
        <div>
          <span className="text-muted-foreground">Ukupna cena: </span>
          <span className="font-medium">
            {formatPrice(cutList.totalCost)} RSD
          </span>
        </div>
      </div>

      {/* Material prices at save time */}
      <div className="flex flex-wrap gap-4 text-xs text-muted-foreground border-t pt-2">
        <div>Korpus: {formatPrice(cutList.pricePerM2)} RSD/m²</div>
        {cutList.frontPricePerM2 > 0 && (
          <div>Front: {formatPrice(cutList.frontPricePerM2)} RSD/m²</div>
        )}
        {cutList.backPricePerM2 > 0 && (
          <div>Zadnja: {formatPrice(cutList.backPricePerM2)} RSD/m²</div>
        )}
      </div>

      {/* Accordion for each element */}
      <Accordion type="multiple" className="w-full">
        {elements.map((element) => {
          const items = groupedItems[element];
          const elementArea = items.reduce((sum, i) => sum + i.areaM2, 0);
          const elementCost = items.reduce((sum, i) => sum + i.cost, 0);

          return (
            <AccordionItem key={element} value={element}>
              <AccordionTrigger className="hover:no-underline">
                <div className="flex items-center justify-between w-full pr-4">
                  <span className="font-medium">Element {element}</span>
                  <div className="flex gap-4 text-sm text-muted-foreground">
                    <span>{items.length} ploča</span>
                    <span>{elementArea.toFixed(2)} m²</span>
                    <span>{formatPrice(elementCost)} RSD</span>
                  </div>
                </div>
              </AccordionTrigger>
              <AccordionContent>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left py-2 px-2 font-medium">
                          Oznaka
                        </th>
                        <th className="text-left py-2 px-2 font-medium">
                          Opis
                        </th>
                        <th className="text-right py-2 px-2 font-medium">
                          Š (cm)
                        </th>
                        <th className="text-right py-2 px-2 font-medium">
                          V (cm)
                        </th>
                        <th className="text-right py-2 px-2 font-medium">
                          Deb. (mm)
                        </th>
                        <th className="text-right py-2 px-2 font-medium">m²</th>
                        <th className="text-right py-2 px-2 font-medium">
                          Cena
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {items.map((item, idx) => (
                        <tr key={idx} className="border-b last:border-b-0">
                          <td className="py-2 px-2 font-mono text-xs">
                            {item.code}
                          </td>
                          <td className="py-2 px-2">{item.desc}</td>
                          <td className="py-2 px-2 text-right">
                            {item.widthCm.toFixed(2)}
                          </td>
                          <td className="py-2 px-2 text-right">
                            {item.heightCm.toFixed(2)}
                          </td>
                          <td className="py-2 px-2 text-right">
                            {item.thicknessMm}
                          </td>
                          <td className="py-2 px-2 text-right">
                            {item.areaM2.toFixed(4)}
                          </td>
                          <td className="py-2 px-2 text-right">
                            {formatPrice(item.cost)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </AccordionContent>
            </AccordionItem>
          );
        })}
      </Accordion>
    </div>
  );
}

export function WardrobePreviewClient({
  wardrobe,
  materials,
  linkedOrders,
}: WardrobePreviewClientProps) {
  const wardrobeRef = useRef<any>(null);
  const [isLoaded, setIsLoaded] = useState(false);
  const setMaterials = useShelfStore((state: ShelfState) => state.setMaterials);

  // Store values for display
  const width = useShelfStore((state: ShelfState) => state.width);
  const height = useShelfStore((state: ShelfState) => state.height);
  const depth = useShelfStore((state: ShelfState) => state.depth);

  // For PDF export
  const viewMode = useShelfStore((state: ShelfState) => state.viewMode);
  const setViewMode = useShelfStore((state: ShelfState) => state.setViewMode);
  const setShowEdgesOnly = useShelfStore(
    (state: ShelfState) => state.setShowEdgesOnly,
  );
  const selectedMaterialId = useShelfStore(
    (state: ShelfState) => state.selectedMaterialId,
  );
  const selectedFrontMaterialId = useShelfStore(
    (state: ShelfState) => state.selectedFrontMaterialId,
  );
  const selectedBackMaterialId = useShelfStore(
    (state: ShelfState) => state.selectedBackMaterialId,
  );
  const elementConfigs = useShelfStore(
    (state: ShelfState) => state.elementConfigs,
  );
  const compartmentExtras = useShelfStore(
    (state: ShelfState) => state.compartmentExtras,
  );
  const doorSelections = useShelfStore(
    (state: ShelfState) => state.doorSelections,
  );
  const hasBase = useShelfStore((state: ShelfState) => state.hasBase);
  const baseHeight = useShelfStore((state: ShelfState) => state.baseHeight);

  // Calculate cut list from store state for PDF export
  const cutList = useMemo(
    () =>
      calculateCutList(
        {
          width,
          height,
          depth,
          selectedMaterialId,
          selectedFrontMaterialId,
          selectedBackMaterialId,
          elementConfigs,
          compartmentExtras,
          doorSelections,
          hasBase,
          baseHeight,
        },
        materials,
      ),
    [
      width,
      height,
      depth,
      selectedMaterialId,
      selectedFrontMaterialId,
      selectedBackMaterialId,
      elementConfigs,
      compartmentExtras,
      doorSelections,
      hasBase,
      baseHeight,
      materials,
    ],
  );

  const cameraMode = viewMode === "Sizing" ? "2D" : viewMode;
  const setCameraMode = (mode: "2D" | "3D") => setViewMode(mode);

  // Format helper for PDF
  const fmt2 = useCallback(
    (n: number | null | undefined) =>
      Number(n ?? 0).toLocaleString(undefined, {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      }),
    [],
  );

  // Image download handlers
  const handleDownloadFrontView = useCallback(async () => {
    const prevDims = useShelfStore.getState().showDimensions;

    // 1. Set dimensions and 2D view
    useShelfStore.getState().setShowDimensions(true);
    if (cameraMode !== "2D") {
      setCameraMode("2D");
    }

    // 2. Wait for mode change to apply
    await new Promise((resolve) => setTimeout(resolve, 100));
    await new Promise(requestAnimationFrame);

    // 3. Trigger fit to view after mode is set
    useShelfStore.getState().triggerFitToView();

    // 4. Wait for camera fit animation to complete (Bounds animation)
    await new Promise((resolve) => setTimeout(resolve, 600));
    await new Promise(requestAnimationFrame);
    await new Promise(requestAnimationFrame);

    const canvas = document.querySelector("canvas");
    if (!canvas) {
      useShelfStore.getState().setShowDimensions(prevDims);
      return;
    }
    const dataUrl = canvas.toDataURL("image/jpeg", 0.95);
    const link = document.createElement("a");
    link.href = dataUrl;
    link.download = `${wardrobe.name}-front-view.jpg`;
    link.click();
    useShelfStore.getState().setShowDimensions(prevDims);
  }, [cameraMode, setCameraMode, wardrobe.name]);

  const handleDownloadFrontEdges = useCallback(async () => {
    const prevDims = useShelfStore.getState().showDimensions;

    // 1. Set edges mode and 2D view
    useShelfStore.getState().setShowDimensions(true);
    setShowEdgesOnly(true);
    if (cameraMode !== "2D") {
      setCameraMode("2D");
    }

    // 2. Wait for mode change to apply
    await new Promise((resolve) => setTimeout(resolve, 100));
    await new Promise(requestAnimationFrame);

    // 3. Trigger fit to view after mode is set
    useShelfStore.getState().triggerFitToView();

    // 4. Wait for camera fit animation to complete (Bounds animation)
    await new Promise((resolve) => setTimeout(resolve, 600));
    await new Promise(requestAnimationFrame);
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
    link.download = `${wardrobe.name}-front-edges.jpg`;
    link.click();
    setShowEdgesOnly(false);
    useShelfStore.getState().setShowDimensions(prevDims);
  }, [cameraMode, setCameraMode, setShowEdgesOnly, wardrobe.name]);

  // Download 2D technical drawing - exports the engineering-style SVG from BlueprintView
  const handleDownloadTechnical2D = useCallback(async () => {
    const prevViewMode = useShelfStore.getState().viewMode;

    // Switch to Sizing view mode which shows the BlueprintView SVG
    useShelfStore.getState().setViewMode("Sizing");

    // Wait for the view to render
    await new Promise((resolve) => setTimeout(resolve, 300));
    await new Promise(requestAnimationFrame);
    await new Promise(requestAnimationFrame);

    // Find the SVG element from BlueprintView by its id
    const svgElement = document.querySelector("#blueprint-technical-drawing");
    if (!svgElement) {
      console.error("SVG element not found");
      useShelfStore.getState().setViewMode(prevViewMode);
      return;
    }

    // Clone SVG and prepare for export
    const svgClone = svgElement.cloneNode(true) as SVGSVGElement;

    // Get the viewBox dimensions
    const viewBox = svgClone.getAttribute("viewBox") || "0 0 1000 700";
    const [, , vbWidth, vbHeight] = viewBox.split(" ").map(Number);

    // Set explicit dimensions for the export
    svgClone.setAttribute("width", String(vbWidth * 2));
    svgClone.setAttribute("height", String(vbHeight * 2));
    svgClone.style.backgroundColor = "white";

    // Serialize SVG to string
    const serializer = new XMLSerializer();
    const svgString = serializer.serializeToString(svgClone);
    const svgBlob = new Blob([svgString], {
      type: "image/svg+xml;charset=utf-8",
    });
    const svgUrl = URL.createObjectURL(svgBlob);

    // Create an image from SVG and convert to PNG for better compatibility
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = vbWidth * 2;
      canvas.height = vbHeight * 2;
      const ctx = canvas.getContext("2d");
      if (ctx) {
        ctx.fillStyle = "white";
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(img, 0, 0);

        // Download as PNG
        const pngUrl = canvas.toDataURL("image/png", 1.0);
        const link = document.createElement("a");
        link.href = pngUrl;
        link.download = `${wardrobe.name}-tehnicki-crtez-2d.png`;
        link.click();
      }
      URL.revokeObjectURL(svgUrl);

      // Restore previous view mode
      useShelfStore.getState().setViewMode(prevViewMode);
    };
    img.onerror = () => {
      console.error("Failed to load SVG as image");
      URL.revokeObjectURL(svgUrl);
      useShelfStore.getState().setViewMode(prevViewMode);
    };
    img.src = svgUrl;
  }, [wardrobe.name]);

  // CSV export handler
  const handleExportCSV = useCallback(() => {
    if (wardrobe.cutList) {
      exportCutListAsCsv(
        wardrobe.cutList.items,
        `${wardrobe.name}-cut-list.csv`,
      );
    }
  }, [wardrobe.cutList, wardrobe.name]);

  // PDF export handler with schematic drawings (matching /design page)
  const handleExportPDF = useCallback(() => {
    // Use calculated cutList from store state (has grouped property)
    if (!cutList || !cutList.grouped) return;

    try {
      const doc = new jsPDF({ unit: "mm", format: "a4" });
      const pageH = 297;
      const margin = 12;
      const baseFont = 11;

      // Sizing helpers from store
      const widthCm = useShelfStore.getState().width;
      const heightCm = useShelfStore.getState().height;
      const storeHasBase = useShelfStore.getState().hasBase;
      const storeBaseHeight = useShelfStore.getState().baseHeight;
      const nBlocksX = Math.max(1, Math.ceil(widthCm / MAX_SEGMENT_X_CM));
      const hasSplitY = heightCm > TARGET_BOTTOM_HEIGHT_CM;
      let bottomModuleCm = Math.min(TARGET_BOTTOM_HEIGHT_CM, heightCm);
      const topModuleCm = hasSplitY
        ? Math.max(MIN_TOP_HEIGHT_CM, heightCm - TARGET_BOTTOM_HEIGHT_CM)
        : 0;
      if (hasSplitY && heightCm - TARGET_BOTTOM_HEIGHT_CM < MIN_TOP_HEIGHT_CM) {
        bottomModuleCm = heightCm - topModuleCm;
      }
      const nModulesY = hasSplitY ? 2 : 1;

      // Precompute block widths
      const equalBlockW = widthCm / nBlocksX;
      const blockWidthsCm: number[] = Array.from(
        { length: nBlocksX },
        () => equalBlockW,
      );

      // Letter index helpers
      const fromLetters = (s: string) => {
        let n = 0;
        for (let i = 0; i < s.length; i++) {
          n = n * 26 + (s.charCodeAt(i) - 64);
        }
        return n - 1;
      };

      const getElementDimsCm = (letter: string) => {
        const idx = fromLetters(letter);
        const rowIdx = Math.floor(idx / nBlocksX);
        const colIdx = idx % nBlocksX;
        const wCm = blockWidthsCm[colIdx] ?? widthCm;
        const hCm =
          nModulesY === 1
            ? heightCm
            : rowIdx === 0
              ? bottomModuleCm
              : topModuleCm;
        return { wCm, hCm, rowIdx, colIdx };
      };

      // Draw helpers
      const drawDimH = (
        x1: number,
        y: number,
        x2: number,
        label: string,
        options?: { arrows?: boolean; ext?: number; font?: number },
      ) => {
        const ext = options?.ext ?? 3;
        const font = options?.font ?? 9;
        doc.line(x1, y - ext, x1, y + ext);
        doc.line(x2, y - ext, x2, y + ext);
        doc.line(x1, y, x2, y);
        if (options?.arrows !== false) {
          doc.line(x1, y, x1 + 1.8, y - 1.2);
          doc.line(x1, y, x1 + 1.8, y + 1.2);
          doc.line(x2, y, x2 - 1.8, y - 1.2);
          doc.line(x2, y, x2 - 1.8, y + 1.2);
        }
        const cx = (x1 + x2) / 2;
        doc.setFontSize(font);
        doc.text(label, cx, y - 1.5, {
          align: "center",
          baseline: "bottom" as any,
        });
        doc.setFontSize(baseFont);
      };

      const drawDimV = (
        x: number,
        y1: number,
        y2: number,
        label: string,
        options?: { arrows?: boolean; ext?: number; font?: number },
      ) => {
        const ext = options?.ext ?? 3;
        const font = options?.font ?? 9;
        doc.line(x - ext, y1, x + ext, y1);
        doc.line(x - ext, y2, x + ext, y2);
        doc.line(x, y1, x, y2);
        if (options?.arrows !== false) {
          doc.line(x, y1, x - 1.2, y1 + 1.8);
          doc.line(x, y1, x + 1.2, y1 + 1.8);
          doc.line(x, y2, x - 1.2, y2 - 1.8);
          doc.line(x, y2, x + 1.2, y2 - 1.8);
        }
        const cy = (y1 + y2) / 2;
        doc.setFontSize(font);
        doc.text(label, x + 2.5, cy, {
          align: "left",
          baseline: "middle" as any,
        });
        doc.setFontSize(baseFont);
      };

      const elementKeys = Object.keys(cutList.grouped).sort();
      if (elementKeys.length === 0) {
        doc.text("Nema elemenata za specifikaciju.", margin, margin);
      }

      elementKeys.forEach((letter, idx) => {
        if (idx > 0) doc.addPage();
        doc.setFontSize(16);
        doc.text(`Specifikacija elementa ${letter}`, margin, margin + 4);
        doc.setFontSize(baseFont);

        // Schematic drawing
        doc.setDrawColor(40);
        doc.setLineWidth(0.2);

        const storeElementConfigs = useShelfStore.getState().elementConfigs;
        const storeCompartmentExtras =
          useShelfStore.getState().compartmentExtras;
        const cfg = (storeElementConfigs as any)[letter] ?? {
          columns: 1,
          rowCounts: [0],
        };
        const cols = Math.max(1, Number(cfg.columns) || 1);
        const {
          wCm: elementWcm,
          hCm: elementHcm,
          rowIdx,
        } = getElementDimsCm(letter);

        // Proportional box size
        const maxBoxW = 140;
        const maxBoxH = 65;
        const aspectRatio = elementWcm / elementHcm;
        let boxW: number;
        let boxH: number;

        if (aspectRatio > maxBoxW / maxBoxH) {
          boxW = maxBoxW;
          boxH = maxBoxW / aspectRatio;
        } else {
          boxH = maxBoxH;
          boxW = maxBoxH * aspectRatio;
        }
        boxW = Math.max(boxW, 35);
        boxH = Math.max(boxH, 25);

        const boxX = margin;
        const boxY = margin + 10;
        doc.rect(boxX, boxY, boxW, boxH, "S");

        const cmPerMmX = elementWcm / boxW;
        const cmPerMmY = elementHcm / boxH;
        const currentMaterialId = useShelfStore.getState().selectedMaterialId;
        const mat = materials.find(
          (m) => String(m.id) === String(currentMaterialId),
        );
        const tCm = Number(mat?.thickness ?? 18) / 10;
        const tOffsetXmm = tCm / cmPerMmX;
        const tOffsetYmm = tCm / cmPerMmY;
        const appliesBase =
          storeHasBase && (heightCm <= TARGET_BOTTOM_HEIGHT_CM || rowIdx === 0);
        const baseMm = appliesBase
          ? Math.max(0, storeBaseHeight / cmPerMmY)
          : 0;
        const innerTopMmY = boxY + tOffsetYmm;
        const innerBottomMmY = boxY + boxH - tOffsetYmm - baseMm;
        const innerLeftMmX = boxX + tOffsetXmm;
        const innerRightMmX = boxX + boxW - tOffsetXmm;

        // Draw base
        if (appliesBase && baseMm > 0) {
          const by = boxY + boxH - baseMm;
          doc.setFillColor("#e6e6e6");
          doc.rect(
            innerLeftMmX,
            by,
            innerRightMmX - innerLeftMmX,
            baseMm,
            "FD",
          );
          doc.setFillColor("#ffffff");
          doc.setFontSize(8);
          doc.text(
            `${fmt2(storeBaseHeight)} cm`,
            innerRightMmX - 6,
            by + baseMm / 2,
            { align: "right", baseline: "middle" as any },
          );
          doc.setFontSize(baseFont);
        }

        // Vertical dividers
        for (let c = 1; c < cols; c++) {
          const x = innerLeftMmX + (c * (innerRightMmX - innerLeftMmX)) / cols;
          doc.line(x, boxY + 1, x, boxY + boxH - 1);
        }

        // Shelves per compartment
        for (let c = 0; c < cols; c++) {
          const count = Math.max(
            0,
            Math.floor(Number(cfg.rowCounts?.[c] ?? 0)),
          );
          if (count <= 0) continue;
          const compX0 = boxX + (c * boxW) / cols + 1;
          const compX1 = boxX + ((c + 1) * boxW) / cols - 1;
          const innerH = Math.max(innerBottomMmY - innerTopMmY, 0);
          const gapMm = innerH / (count + 1);
          const gapCm = gapMm * cmPerMmY;
          for (let s = 1; s <= count; s++) {
            const y = innerTopMmY + s * gapMm;
            doc.line(compX0, y, compX1, y);
          }
          if (c === 0) {
            const dimXLeft = boxX - 6;
            drawDimV(
              dimXLeft,
              innerTopMmY,
              innerTopMmY + gapMm,
              `${fmt2(gapCm)} cm × ${count + 1}`,
              { arrows: true, ext: 2.5, font: 8 },
            );
          }
        }

        // Drawers
        const extras = (storeCompartmentExtras as any)[letter] ?? {};
        if (extras.drawers) {
          const drawerHcm = DRAWER_HEIGHT_CM;
          const gapCm = DRAWER_GAP_CM;
          const drawerHMm = drawerHcm / cmPerMmY;
          const gapMm = gapCm / cmPerMmY;
          const innerHMm = Math.max(innerBottomMmY - innerTopMmY, 0);
          const maxAuto = Math.max(
            0,
            Math.floor((innerHMm + gapMm) / (drawerHMm + gapMm)),
          );
          const countFromState = Math.max(
            0,
            Math.floor(Number(extras.drawersCount ?? 0)),
          );
          const used =
            countFromState > 0 ? Math.min(countFromState, maxAuto) : maxAuto;
          let lastTopOffsetMm = 0;
          for (let d = 0; d < used; d++) {
            const bottomOffsetMm = d * (drawerHMm + gapMm);
            const topOffsetMm = Math.min(
              bottomOffsetMm + drawerHMm,
              innerHMm - gapMm,
            );
            lastTopOffsetMm = topOffsetMm;
            const yTop = innerBottomMmY - topOffsetMm;
            const yBottom = innerBottomMmY - bottomOffsetMm;
            const hMm = Math.max(0, yBottom - yTop);
            if (yTop < innerTopMmY) break;
            doc.rect(
              innerLeftMmX + 1,
              yTop,
              innerRightMmX - innerLeftMmX - 2,
              hMm,
              "S",
            );
            const hCm = hMm * cmPerMmY;
            doc.setFontSize(8);
            doc.text(`${fmt2(hCm)} cm`, boxX + boxW / 2, yTop + hMm / 2, {
              align: "center",
              baseline: "middle" as any,
            });
            doc.setFontSize(baseFont);
          }
          if (used > 0 && used < maxAuto) {
            const shelfOffsetMm = lastTopOffsetMm + gapMm + tCm / cmPerMmY;
            if (shelfOffsetMm < innerHMm) {
              const shelfY = innerBottomMmY - shelfOffsetMm;
              doc.line(innerLeftMmX, shelfY, innerRightMmX, shelfY);
            }
          }
        }

        // Rod indicator
        if (extras.rod) {
          const innerHMm = Math.max(innerBottomMmY - innerTopMmY, 0);
          const yRod = innerBottomMmY - innerHMm * 0.25;
          const inset = 2;
          doc.setLineWidth(0.4);
          doc.line(innerLeftMmX + inset, yRod, innerRightMmX - inset, yRod);
          doc.setLineWidth(0.2);
        }

        // LED label
        if (extras.led) {
          const yLabel = innerTopMmY + 3;
          doc.setFontSize(7.5);
          doc.text("LED", (innerLeftMmX + innerRightMmX) / 2, yLabel, {
            align: "center",
            baseline: "top" as any,
          });
          doc.setFontSize(baseFont);
        }

        // Vertical divider (dashed)
        if (extras.verticalDivider) {
          const x = boxX + boxW / 2;
          const dashLen = 2;
          const gapLen = 2;
          let yy = boxY + 1;
          while (yy < boxY + boxH - 1) {
            const y2 = Math.min(yy + dashLen, boxY + boxH - 1);
            doc.line(x, yy, x, y2);
            yy = y2 + gapLen;
          }
        }

        // Dimension lines
        const dimY = boxY + boxH + 6;
        drawDimH(boxX, dimY, boxX + boxW, `${fmt2(elementWcm)} cm`, {
          arrows: true,
          ext: 3,
          font: 9,
        });
        const dimX = boxX + boxW + 8;
        drawDimV(dimX, boxY, boxY + boxH, `${fmt2(elementHcm)} cm`, {
          arrows: true,
          ext: 3,
          font: 9,
        });

        // Per-compartment widths
        if (cols > 1) {
          const compY = dimY + 6;
          for (let c = 0; c < cols; c++) {
            const x0 = boxX + (c * boxW) / cols;
            const x1 = boxX + ((c + 1) * boxW) / cols;
            drawDimH(x0, compY, x1, `${fmt2(elementWcm / cols)} cm`, {
              arrows: true,
              ext: 2.5,
              font: 8,
            });
          }
        }

        // Door type label
        const doorGroups = useShelfStore.getState().doorGroups;
        const elementDoorGroup = doorGroups.find(
          (g: { compartments: string[] }) =>
            g.compartments.some((c: string) => {
              const parsed = parseSubCompKey(c);
              return (parsed ? parsed.compKey : c).startsWith(letter);
            }),
        );

        const infoStartX = boxX + boxW + 20;
        let infoY = boxY + 3;

        if (elementDoorGroup && (elementDoorGroup as any).type !== "none") {
          const doorTypeLabels: Record<string, string> = {
            left: "Leva vrata",
            right: "Desna vrata",
            double: "Dvokrilna vrata",
            leftMirror: "Leva vrata (ogledalo)",
            rightMirror: "Desna vrata (ogledalo)",
            doubleMirror: "Dvokrilna vrata (ogledalo)",
            drawerStyle: "Vrata fioka stil",
          };
          const doorLabel =
            doorTypeLabels[(elementDoorGroup as any).type] ||
            (elementDoorGroup as any).type;

          doc.setFontSize(10);
          doc.setFont("helvetica", "bold");
          doc.text("Vrata:", infoStartX, infoY);
          doc.setFont("helvetica", "normal");
          doc.text(doorLabel, infoStartX + 16, infoY);
          infoY += 6;
        }

        // Table
        const rows = cutList.grouped[letter] || [];
        const headers = [
          "Oznaka",
          "Opis",
          "Sirina",
          "Visina",
          "Debljina",
          "m2",
          "Cena",
        ];
        const colX = [margin, 35, 95, 120, 143, 164, 182];
        const colW = [
          colX[1] - colX[0],
          colX[2] - colX[1],
          colX[3] - colX[2],
          colX[4] - colX[3],
          colX[5] - colX[4],
          colX[6] - colX[5],
          210 - margin - colX[6],
        ];
        const numericCols = [2, 3, 4, 5, 6];

        let y = Math.max(boxY + boxH + 14, dimY + (cols > 1 ? 10 : 6));
        doc.setFont("helvetica", "bold");
        doc.setFontSize(9);
        headers.forEach((h, i) => {
          const isNumeric = numericCols.includes(i);
          const xPos = isNumeric ? colX[i] + colW[i] - 2 : colX[i] + 2;
          const align = isNumeric ? "right" : "left";
          doc.text(h, xPos, y, { align: align as any });
          doc.rect(colX[i], y - 5, colW[i], 7, "S");
        });
        doc.setFont("helvetica", "normal");
        doc.setFontSize(8);
        y += 8;

        rows.forEach((it: any) => {
          const line = [
            it.code ?? "",
            String(it.desc ?? ""),
            fmt2(it.widthCm ?? 0),
            fmt2(it.heightCm ?? 0),
            fmt2(it.thicknessMm ?? 0),
            fmt2(it.areaM2 ?? 0),
            fmt2(it.cost ?? 0),
          ];
          const descLines = doc.splitTextToSize(line[1], colW[1] - 4);
          const rowH = Math.max(7, (descLines.length || 1) * 4 + 3);

          for (let i = 0; i < 7; i++) {
            doc.rect(colX[i], y - 5, colW[i], rowH, "S");
            const isNumeric = numericCols.includes(i);
            const xPos = isNumeric ? colX[i] + colW[i] - 2 : colX[i] + 2;
            const align = isNumeric ? "right" : "left";
            if (i === 1) {
              doc.text(descLines, colX[1] + 2, y);
            } else {
              doc.text(line[i], xPos, y, { align: align as any });
            }
          }
          y += rowH + 2;
          if (y > pageH - margin - 10) {
            doc.addPage();
            y = margin + 10;
          }
        });

        // Footer totals
        const elementArea = rows.reduce(
          (a: number, b: any) => a + (b.areaM2 ?? 0),
          0,
        );
        const elementCost = rows.reduce(
          (a: number, b: any) => a + (b.cost ?? 0),
          0,
        );
        y += 8;
        doc.setFont("helvetica", "bold");
        doc.text(`Ukupna kvadratura: ${fmt2(elementArea)} m2`, margin, y);
        doc.text(`Cena materijala: ${fmt2(elementCost)}`, margin + 70, y);
        doc.setFont("helvetica", "normal");
      });

      doc.save(`${wardrobe.name}-specifikacija.pdf`);
    } catch (e) {
      console.error("PDF export failed", e);
    }
  }, [cutList, wardrobe.name, fmt2, materials]);

  // Load materials and wardrobe data on mount
  useEffect(() => {
    // Set materials first
    setMaterials(materials);

    // CRITICAL: Reset store to defaults before applying wardrobe data
    // This prevents stale state from previous wardrobes polluting the view
    useShelfStore.getState().resetToDefaults();

    // Then apply wardrobe snapshot
    if (wardrobe.data) {
      applyWardrobeSnapshot(wardrobe.data);
    }

    setIsLoaded(true);
  }, [materials, wardrobe.data, setMaterials]);

  // Detect bfcache restore and reload page to get fresh data
  // This fixes stale data showing when user presses browser back button
  useEffect(() => {
    // Track when page was loaded
    const loadTime = Date.now();

    // Handle bfcache restore
    const handlePageShow = (event: PageTransitionEvent) => {
      // event.persisted is true when page is restored from bfcache
      if (event.persisted) {
        window.location.reload();
      }
    };

    // Handle visibility change - reload if returning after being hidden for a while
    // This catches Next.js App Router's in-memory cache restoration
    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        const hiddenDuration = Date.now() - loadTime;
        // If page was hidden for more than 5 seconds and is now visible,
        // reload to get fresh data
        if (hiddenDuration > 5000) {
          window.location.reload();
        }
      }
    };

    // Handle popstate (browser back/forward) - this catches cases where
    // bfcache/visibilitychange don't fire
    const handlePopState = () => {
      window.location.reload();
    };

    window.addEventListener("pageshow", handlePageShow);
    document.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("popstate", handlePopState);

    return () => {
      window.removeEventListener("pageshow", handlePageShow);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("popstate", handlePopState);
    };
  }, []);

  // Enable preview mode (disables editing controls) on mount
  const setIsPreviewMode = useShelfStore(
    (state: ShelfState) => state.setIsPreviewMode,
  );
  useEffect(() => {
    setIsPreviewMode(true);
    return () => {
      setIsPreviewMode(false);
    };
  }, [setIsPreviewMode]);

  const handleDownloadThumbnail = () => {
    if (wardrobe.thumbnail) {
      const link = document.createElement("a");
      link.href = wardrobe.thumbnail;
      link.download = `${wardrobe.name}-thumbnail.png`;
      link.click();
    }
  };

  if (!isLoaded) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin" />
          <p className="text-sm text-muted-foreground">Učitavanje...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" asChild>
            <Link href="/admin/wardrobes">
              <ArrowLeft className="h-5 w-5" />
            </Link>
          </Button>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <Popover>
                <PopoverTrigger asChild>
                  <h1 className="text-2xl sm:text-3xl font-bold truncate cursor-pointer">
                    {wardrobe.name}
                  </h1>
                </PopoverTrigger>
                <PopoverContent
                  side="bottom"
                  className="w-auto max-w-xs p-2 text-sm"
                >
                  {wardrobe.name}
                </PopoverContent>
              </Popover>
              {wardrobe.isModel && <Badge variant="secondary">Model</Badge>}
            </div>
            <div className="flex items-center gap-2 text-sm">
              <span className="text-muted-foreground">Pregled ormana</span>
              {linkedOrders.length > 0 && (
                <>
                  <span className="text-muted-foreground">•</span>
                  <Link
                    href={`/admin/orders/${linkedOrders[0].id}`}
                    className="text-orange-600 hover:text-orange-700 hover:underline font-medium"
                  >
                    Porudžbina #{linkedOrders[0].orderNumber}
                  </Link>
                </>
              )}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <ViewModeToggle />
          {linkedOrders.length > 0 ? (
            <Button variant="default" asChild>
              <Link href={`/admin/orders/${linkedOrders[0].id}`}>
                <Pencil className="h-4 w-4 mr-2" />
                Uredi preko porudžbine #{linkedOrders[0].orderNumber}
              </Link>
            </Button>
          ) : (
            <Button variant="default" asChild>
              <Link
                href={`/design?load=${wardrobe.id}&fromWardrobe=${wardrobe.id}&wardrobeName=${encodeURIComponent(wardrobe.name)}`}
              >
                <Pencil className="h-4 w-4 mr-2" />
                Izmeni dizajn
              </Link>
            </Button>
          )}
          {wardrobe.thumbnail && (
            <Button variant="outline" onClick={handleDownloadThumbnail}>
              <Download className="h-4 w-4 mr-2" />
              Slika
            </Button>
          )}
        </div>
      </div>

      {/* Info Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <User className="h-5 w-5 text-muted-foreground" />
            <div>
              <p className="text-sm text-muted-foreground">Vlasnik</p>
              <p className="font-medium">{wardrobe.userName || "Nepoznat"}</p>
              {wardrobe.userEmail && (
                <p className="text-xs text-muted-foreground">
                  {wardrobe.userEmail}
                </p>
              )}
            </div>
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center gap-3">
            <Ruler className="h-5 w-5 text-muted-foreground" />
            <div>
              <p className="text-sm text-muted-foreground">Dimenzije</p>
              <p className="font-medium">
                {width} × {height} × {depth} cm
              </p>
            </div>
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center gap-3">
            <Calendar className="h-5 w-5 text-muted-foreground" />
            <div>
              <p className="text-sm text-muted-foreground">Kreiran</p>
              <p className="font-medium">
                {new Date(wardrobe.createdAt).toLocaleDateString("sr-RS", {
                  year: "numeric",
                  month: "short",
                  day: "numeric",
                })}
              </p>
            </div>
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center gap-3">
            <Calendar className="h-5 w-5 text-muted-foreground" />
            <div>
              <p className="text-sm text-muted-foreground">Ažuriran</p>
              <p className="font-medium">
                {new Date(wardrobe.updatedAt).toLocaleDateString("sr-RS", {
                  year: "numeric",
                  month: "short",
                  day: "numeric",
                })}
              </p>
            </div>
          </div>
        </Card>
      </div>

      {/* 3D Preview */}
      <Card className="overflow-hidden">
        <div className="h-[500px] sm:h-[600px]">
          <Scene wardrobeRef={wardrobeRef} />
        </div>
      </Card>

      {/* Downloads */}
      <Card className="p-6 space-y-4">
        <h2 className="text-lg font-semibold">Preuzimanja</h2>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={handleDownloadFrontView}>
            <Download className="h-4 w-4 mr-2" />
            Frontalni prikaz
          </Button>
          <Button variant="outline" onClick={handleDownloadFrontEdges}>
            <Download className="h-4 w-4 mr-2" />
            Ivice
          </Button>
          <Button variant="outline" onClick={handleDownloadTechnical2D}>
            <Download className="h-4 w-4 mr-2" />
            Tehnički crtež 2D
          </Button>
          <Button
            variant="outline"
            onClick={handleExportPDF}
            disabled={!wardrobe.cutList}
          >
            <FileText className="h-4 w-4 mr-2" />
            Specifikacija PDF
          </Button>
          <Button
            variant="outline"
            onClick={handleExportCSV}
            disabled={!wardrobe.cutList}
          >
            <FileSpreadsheet className="h-4 w-4 mr-2" />
            CSV za CNC
          </Button>
        </div>
      </Card>

      {/* Cut List */}
      <Card className="p-6 space-y-4">
        <h2 className="text-lg font-semibold">Lista ploča za sečenje (CNC)</h2>
        {wardrobe.cutList ? (
          <CutListDisplay cutList={wardrobe.cutList} />
        ) : (
          <p className="text-muted-foreground">
            Podaci o pločama nisu dostupni za starije ormare.
          </p>
        )}
      </Card>
    </div>
  );
}
