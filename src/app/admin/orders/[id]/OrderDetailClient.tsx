"use client";

import jsPDF from "jspdf";
import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import {
  ArrowLeft,
  Download,
  FileText,
  FileSpreadsheet,
  Copy,
  Check,
  Pencil,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { Scene } from "@/components/Scene";
import { ViewModeToggle } from "@/components/ViewModeToggle";
import {
  useShelfStore,
  parseSubCompKey,
  type Material,
  type ShelfState,
} from "@/lib/store";
import { applyWardrobeSnapshot } from "@/lib/serializeWardrobe";
import { exportCutListAsCsv } from "@/lib/exportCsv";
import { calculateCutList } from "@/lib/calcCutList";
import {
  DRAWER_HEIGHT_CM,
  DRAWER_GAP_CM,
  MAX_SEGMENT_X_CM,
  TARGET_BOTTOM_HEIGHT_CM,
  MIN_TOP_HEIGHT_CM,
} from "@/lib/wardrobe-constants";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

interface PriceBreakdown {
  korpus: { areaM2: number; price: number; materialName: string };
  front: { areaM2: number; price: number; materialName: string };
  back: { areaM2: number; price: number; materialName: string };
  handles?: { count: number; price: number };
}

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
}

interface Order {
  id: string;
  orderNumber: number;
  userId: string;
  // Customer info from order
  customerName: string;
  customerEmail: string | null;
  customerPhone: string | null;
  // Shipping address
  shippingStreet: string;
  shippingApartment: string | null;
  shippingCity: string;
  shippingPostalCode: string;
  wardrobeId: string | null;
  wardrobeName: string | null;
  materialId: number;
  materialName: string | null;
  frontMaterialId: number | null;
  frontMaterialName: string | null;
  backMaterialId: number | null;
  backMaterialName: string | null;
  area: number;
  totalPrice: number;
  priceBreakdown: PriceBreakdown | null;
  cutList: CutList | null;
  status: "open" | "archived" | "cancelled";
  paymentStatus:
    | "unpaid"
    | "pending"
    | "partially_paid"
    | "paid"
    | "partially_refunded"
    | "refunded"
    | "voided";
  fulfillmentStatus:
    | "unfulfilled"
    | "in_progress"
    | "on_hold"
    | "scheduled"
    | "partially_fulfilled"
    | "fulfilled";
  returnStatus:
    | "none"
    | "return_requested"
    | "return_in_progress"
    | "returned"
    | "inspection_complete";
  notes: string | null;
  createdAt: string;
  updatedAt: string;
}

interface OrderDetailClientProps {
  order: Order;
  wardrobeData: Record<string, unknown> | null;
  materials: Material[];
}

const statusLabels: Record<Order["status"], string> = {
  open: "Otvoren",
  archived: "Arhiviran",
  cancelled: "Otkazan",
};

const paymentLabels: Record<Order["paymentStatus"], string> = {
  unpaid: "Neplaćeno",
  pending: "Na čekanju",
  partially_paid: "Delimično plaćeno",
  paid: "Plaćeno",
  partially_refunded: "Delimično refundirano",
  refunded: "Refundirano",
  voided: "Poništeno",
};

const fulfillmentLabels: Record<Order["fulfillmentStatus"], string> = {
  unfulfilled: "Neizvršeno",
  in_progress: "U toku",
  on_hold: "Na čekanju",
  scheduled: "Zakazano",
  partially_fulfilled: "Delimično izvršeno",
  fulfilled: "Izvršeno",
};

const returnLabels: Record<Order["returnStatus"], string> = {
  none: "Nema",
  return_requested: "Zatraženo",
  return_in_progress: "U toku",
  returned: "Vraćeno",
  inspection_complete: "Inspekcija završena",
};

// Copy button component
function CopyButton({ text, className }: { text: string; className?: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      toast.success("Kopirano u clipboard");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Kopiranje nije uspelo");
    }
  };

  return (
    <button
      onClick={handleCopy}
      className={cn(
        "inline-flex items-center justify-center h-6 w-6 rounded hover:bg-muted transition-colors",
        className,
      )}
      title="Kopiraj"
    >
      {copied ? (
        <Check className="h-3.5 w-3.5 text-green-600" />
      ) : (
        <Copy className="h-3.5 w-3.5 text-muted-foreground" />
      )}
    </button>
  );
}

// Badge colors for header display
const paymentColors: Record<Order["paymentStatus"], string> = {
  unpaid: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
  pending:
    "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200",
  partially_paid:
    "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200",
  paid: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
  partially_refunded:
    "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200",
  refunded: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
  voided: "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200",
};

const fulfillmentColors: Record<Order["fulfillmentStatus"], string> = {
  unfulfilled: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
  in_progress: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
  on_hold:
    "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200",
  scheduled:
    "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200",
  partially_fulfilled:
    "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200",
  fulfilled:
    "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
};

export function OrderDetailClient({
  order,
  wardrobeData,
  materials,
}: OrderDetailClientProps) {
  const router = useRouter();
  const wardrobeRef = useRef<any>(null);
  const [saving, setSaving] = useState(false);
  const [isSceneLoaded, setIsSceneLoaded] = useState(false);

  const [status, setStatus] = useState(order.status);
  const [paymentStatus, setPaymentStatus] = useState(order.paymentStatus);
  const [fulfillmentStatus, setFulfillmentStatus] = useState(
    order.fulfillmentStatus,
  );
  const [returnStatus, setReturnStatus] = useState(order.returnStatus);
  const [notes, setNotes] = useState(order.notes || "");

  // For 3D preview
  const setMaterials = useShelfStore((state: ShelfState) => state.setMaterials);
  const viewMode = useShelfStore((state: ShelfState) => state.viewMode);
  const setViewMode = useShelfStore((state: ShelfState) => state.setViewMode);
  const setShowEdgesOnly = useShelfStore(
    (state: ShelfState) => state.setShowEdgesOnly,
  );

  // Store values for PDF export with schematic drawings
  const width = useShelfStore((state: ShelfState) => state.width);
  const height = useShelfStore((state: ShelfState) => state.height);
  const depth = useShelfStore((state: ShelfState) => state.depth);
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

  // Calculate cut list from store state for PDF export (has grouped property)
  const calculatedCutList = useMemo(
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

  // Load wardrobe data into store for 3D preview
  useEffect(() => {
    if (wardrobeData && materials.length > 0) {
      setMaterials(materials);

      // CRITICAL: Reset store to defaults before applying wardrobe data
      // This prevents stale state from previous wardrobes polluting the view
      useShelfStore.getState().resetToDefaults();

      applyWardrobeSnapshot(wardrobeData);
      setIsSceneLoaded(true);
    }
  }, [wardrobeData, materials, setMaterials]);

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
    useShelfStore.getState().setShowDimensions(true);
    useShelfStore.getState().triggerFitToView();
    if (cameraMode !== "2D") {
      setCameraMode("2D");
    }
    // Wait for scene to fully re-render with camera positioned
    await new Promise((resolve) => setTimeout(resolve, 500));
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
    link.download = `order-${order.orderNumber}-front-view.jpg`;
    link.click();
    useShelfStore.getState().setShowDimensions(prevDims);
  }, [cameraMode, setCameraMode, order.orderNumber]);

  const handleDownloadFrontEdges = useCallback(async () => {
    const prevDims = useShelfStore.getState().showDimensions;
    useShelfStore.getState().setShowDimensions(true);
    setShowEdgesOnly(true);
    useShelfStore.getState().triggerFitToView();
    if (cameraMode !== "2D") {
      setCameraMode("2D");
    }
    // Wait for scene to fully re-render with edges-only mode
    await new Promise((resolve) => setTimeout(resolve, 500));
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
    link.download = `order-${order.orderNumber}-front-edges.jpg`;
    link.click();
    setShowEdgesOnly(false);
    useShelfStore.getState().setShowDimensions(prevDims);
  }, [cameraMode, setCameraMode, setShowEdgesOnly, order.orderNumber]);

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
        link.download = `order-${order.orderNumber}-tehnicki-crtez-2d.png`;
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
  }, [order.orderNumber]);

  // CSV export handler
  const handleExportCSV = useCallback(() => {
    if (order.cutList) {
      exportCutListAsCsv(
        order.cutList.items,
        `order-${order.orderNumber}-cut-list.csv`,
      );
    }
  }, [order.cutList, order.orderNumber]);

  // PDF export handler with schematic drawings (matching /design page)
  const handleExportPDF = useCallback(() => {
    // Use calculated cutList from store state (has grouped property)
    if (!calculatedCutList || !calculatedCutList.grouped) return;

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

      const elementKeys = Object.keys(calculatedCutList.grouped).sort();
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
        const storeCompartmentExtras = useShelfStore.getState().compartmentExtras;
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
        const baseMm = appliesBase ? Math.max(0, storeBaseHeight / cmPerMmY) : 0;
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
        const rows = calculatedCutList.grouped[letter] || [];
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

      doc.save(`order-${order.orderNumber}-specifikacija.pdf`);
    } catch (e) {
      console.error("PDF export failed", e);
    }
  }, [calculatedCutList, order.orderNumber, fmt2, materials]);

  const hasChanges =
    status !== order.status ||
    paymentStatus !== order.paymentStatus ||
    fulfillmentStatus !== order.fulfillmentStatus ||
    returnStatus !== order.returnStatus ||
    notes !== (order.notes || "");

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await fetch(`/api/admin/orders/${order.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status,
          paymentStatus,
          fulfillmentStatus,
          returnStatus,
          notes: notes || null,
        }),
      });

      if (!res.ok) {
        const json = await res.json();
        throw new Error(json.error || "Greska pri cuvanju");
      }

      toast.success("Porudzbina azurirana");
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Greska pri cuvanju");
    } finally {
      setSaving(false);
    }
  };

  const areaM2 = order.area / 10000;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/admin/orders">
            <ArrowLeft className="h-5 w-5" />
          </Link>
        </Button>
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-2xl sm:text-3xl font-bold">
              #{order.orderNumber}
            </h1>
            <span
              className={cn(
                "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium",
                paymentColors[order.paymentStatus],
              )}
            >
              {paymentLabels[order.paymentStatus]}
            </span>
            <span
              className={cn(
                "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium",
                fulfillmentColors[order.fulfillmentStatus],
              )}
            >
              {fulfillmentLabels[order.fulfillmentStatus]}
            </span>
          </div>
          <p className="text-sm text-muted-foreground">
            {new Date(order.createdAt).toLocaleDateString("sr-RS", {
              day: "numeric",
              month: "long",
              year: "numeric",
              hour: "2-digit",
              minute: "2-digit",
            })}
          </p>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Order Info */}
        <Card className="p-6 space-y-4">
          <h2 className="text-lg font-semibold">Informacije</h2>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <Label className="text-muted-foreground">Kupac</Label>
              <div className="flex items-center gap-1">
                <p className="font-medium">{order.customerName}</p>
                <CopyButton text={order.customerName} />
              </div>
              {order.customerEmail && (
                <div className="flex items-center gap-1">
                  <p className="text-sm text-muted-foreground">
                    {order.customerEmail}
                  </p>
                  <CopyButton text={order.customerEmail} />
                </div>
              )}
              {order.customerPhone && (
                <div className="flex items-center gap-1">
                  <p className="text-sm text-muted-foreground">
                    {order.customerPhone}
                  </p>
                  <CopyButton text={order.customerPhone} />
                </div>
              )}
            </div>

            <div>
              <Label className="text-muted-foreground">Adresa za dostavu</Label>
              <div className="flex items-center gap-1">
                <p className="font-medium">{order.shippingStreet}</p>
                <CopyButton text={order.shippingStreet} />
              </div>
              {order.shippingApartment && (
                <div className="flex items-center gap-1">
                  <p className="text-sm">{order.shippingApartment}</p>
                  <CopyButton text={order.shippingApartment} />
                </div>
              )}
              <div className="flex items-center gap-1">
                <p className="text-sm text-muted-foreground">
                  {order.shippingPostalCode} {order.shippingCity}
                </p>
                <CopyButton
                  text={`${order.shippingPostalCode} ${order.shippingCity}`}
                />
              </div>
              {/* Copy full address */}
              <div className="mt-2">
                <button
                  onClick={() => {
                    const fullAddress = [
                      order.shippingStreet,
                      order.shippingApartment,
                      `${order.shippingPostalCode} ${order.shippingCity}`,
                    ]
                      .filter(Boolean)
                      .join(", ");
                    navigator.clipboard.writeText(fullAddress);
                    toast.success("Kompletna adresa kopirana");
                  }}
                  className="text-xs text-primary hover:underline flex items-center gap-1"
                >
                  <Copy className="h-3 w-3" />
                  Kopiraj celu adresu
                </button>
              </div>
            </div>

            <div className="sm:col-span-2">
              <Label className="text-muted-foreground">Orman</Label>
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                <p className="font-medium">
                  {order.wardrobeName || (
                    <span className="text-muted-foreground">Nije povezan</span>
                  )}
                </p>
                {order.wardrobeId && (
                  <Button
                    variant="outline"
                    size="sm"
                    asChild
                    className="w-fit border-accent text-accent hover:bg-accent/90 hover:text-white"
                  >
                    <Link
                      href={`/design?load=${order.wardrobeId}&fromOrder=${order.id}&orderNum=${order.orderNumber}`}
                    >
                      <Pencil className="h-3.5 w-3.5" />
                      Izmeni crtež
                    </Link>
                  </Button>
                )}
              </div>
            </div>

            <div className="sm:col-span-2 space-y-3 min-w-0">
              <Label className="text-muted-foreground">Materijali i cene</Label>
              <div className="rounded-lg border bg-muted/30 p-4 min-w-0">
                <div className="overflow-x-auto w-full min-w-0 -mx-4 px-4">
                  <table className="w-full min-w-[400px] table-fixed text-sm">
                    <thead>
                      <tr className="border-b text-muted-foreground">
                        <th className="w-[50%] sm:w-[60%] text-left py-2 pr-2 font-medium">
                          Materijal
                        </th>
                        <th className="w-[18%] sm:w-[20%] text-right py-2 pl-2 pr-3 font-medium whitespace-nowrap">
                          m²
                        </th>
                        <th className="w-[32%] sm:w-[20%] text-right py-2 pl-3 font-medium">
                          Cena
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border/50">
                      {/* Korpus */}
                      <tr>
                        <td className="py-2.5 pr-2">
                          <div className="text-muted-foreground text-xs">
                            Korpus
                          </div>
                          <div
                            className="font-medium max-w-[180px] sm:max-w-full"
                            title={order.materialName || ""}
                          >
                            {order.materialName || "-"}
                          </div>
                        </td>
                        <td className="py-2.5 pl-2 pr-3 text-right tabular-nums whitespace-nowrap">
                          {order.priceBreakdown
                            ? order.priceBreakdown.korpus.areaM2.toFixed(2)
                            : "-"}
                        </td>
                        <td className="py-2.5 pl-3 text-right tabular-nums whitespace-nowrap">
                          {order.priceBreakdown
                            ? `${order.priceBreakdown.korpus.price.toLocaleString("sr-RS")} RSD`
                            : "-"}
                        </td>
                      </tr>
                      {/* Lica/Vrata */}
                      <tr>
                        <td className="py-2.5 pr-2">
                          <div className="text-muted-foreground text-xs">
                            Lica/Vrata
                          </div>
                          <div
                            className="font-medium max-w-[180px] sm:max-w-full"
                            title={order.frontMaterialName || ""}
                          >
                            {order.frontMaterialName || "-"}
                          </div>
                        </td>
                        <td className="py-2.5 pl-2 pr-3 text-right tabular-nums whitespace-nowrap">
                          {order.priceBreakdown
                            ? order.priceBreakdown.front.areaM2.toFixed(2)
                            : "-"}
                        </td>
                        <td className="py-2.5 pl-3 text-right tabular-nums whitespace-nowrap">
                          {order.priceBreakdown
                            ? `${order.priceBreakdown.front.price.toLocaleString("sr-RS")} RSD`
                            : "-"}
                        </td>
                      </tr>
                      {/* Leđa */}
                      {order.backMaterialId && (
                        <tr>
                          <td className="py-2.5 pr-2">
                            <div className="text-muted-foreground text-xs">
                              Leđa
                            </div>
                            <div
                              className="font-medium max-w-[180px] sm:max-w-full"
                              title={order.backMaterialName || ""}
                            >
                              {order.backMaterialName || "-"}
                            </div>
                          </td>
                          <td className="py-2.5 pl-2 pr-3 text-right tabular-nums whitespace-nowrap">
                            {order.priceBreakdown
                              ? order.priceBreakdown.back.areaM2.toFixed(2)
                              : "-"}
                          </td>
                          <td className="py-2.5 pl-3 text-right tabular-nums whitespace-nowrap">
                            {order.priceBreakdown
                              ? `${order.priceBreakdown.back.price.toLocaleString("sr-RS")} RSD`
                              : "-"}
                          </td>
                        </tr>
                      )}
                      {/* Ručke */}
                      {order.priceBreakdown?.handles &&
                        order.priceBreakdown.handles.count > 0 && (
                          <tr>
                            <td className="py-2.5 pr-2">
                              <div className="text-muted-foreground text-xs">
                                Ručke
                              </div>
                              <div className="font-medium">
                                {order.priceBreakdown.handles.count} kom
                              </div>
                            </td>
                            <td className="py-2.5 pl-2 pr-3 text-right tabular-nums whitespace-nowrap">
                              -
                            </td>
                            <td className="py-2.5 pl-3 text-right tabular-nums whitespace-nowrap">
                              {`${order.priceBreakdown.handles.price.toLocaleString("sr-RS")} RSD`}
                            </td>
                          </tr>
                        )}
                    </tbody>
                    <tfoot>
                      <tr className="border-t-2 border-border">
                        <td className="py-3 pr-2 font-semibold">Ukupno</td>
                        <td className="py-3 pl-2 pr-3 text-right tabular-nums font-medium whitespace-nowrap">
                          {areaM2.toFixed(2)} m²
                        </td>
                        <td className="py-3 pl-3 text-right">
                          <div className="flex flex-col items-end leading-tight sm:flex-row sm:items-baseline sm:gap-1">
                            <span className="text-base sm:text-lg font-bold tabular-nums">
                              {order.totalPrice.toLocaleString("sr-RS")}
                            </span>
                            <span className="text-xs sm:text-sm font-medium">
                              RSD
                            </span>
                          </div>
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </div>
            </div>

            <div>
              <Label className="text-muted-foreground">Kreirana</Label>
              <p className="font-medium">
                {new Date(order.createdAt).toLocaleDateString("sr-RS", {
                  day: "2-digit",
                  month: "2-digit",
                  year: "numeric",
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </p>
            </div>

            <div>
              <Label className="text-muted-foreground">Azurirana</Label>
              <p className="font-medium">
                {new Date(order.updatedAt).toLocaleDateString("sr-RS", {
                  day: "2-digit",
                  month: "2-digit",
                  year: "numeric",
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </p>
            </div>
          </div>
        </Card>

        {/* Status Management */}
        <Card className="p-6 space-y-4">
          <h2 className="text-lg font-semibold">Statusi</h2>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Status porudžbine</Label>
              <Select
                value={status}
                onValueChange={(v) => setStatus(v as Order["status"])}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(statusLabels).map(([value, label]) => (
                    <SelectItem key={value} value={value}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Status placanja</Label>
              <Select
                value={paymentStatus}
                onValueChange={(v) =>
                  setPaymentStatus(v as Order["paymentStatus"])
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(paymentLabels).map(([value, label]) => (
                    <SelectItem key={value} value={value}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Status isporuke</Label>
              <Select
                value={fulfillmentStatus}
                onValueChange={(v) =>
                  setFulfillmentStatus(v as Order["fulfillmentStatus"])
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(fulfillmentLabels).map(([value, label]) => (
                    <SelectItem key={value} value={value}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Status povrata</Label>
              <Select
                value={returnStatus}
                onValueChange={(v) =>
                  setReturnStatus(v as Order["returnStatus"])
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(returnLabels).map(([value, label]) => (
                    <SelectItem key={value} value={value}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Napomene</Label>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Dodatne napomene..."
              rows={3}
            />
          </div>

          <div className="flex justify-end pt-2">
            <Button onClick={handleSave} disabled={saving || !hasChanges}>
              {saving ? "Cuvanje..." : "Sacuvaj izmene"}
            </Button>
          </div>
        </Card>
      </div>

      {/* 3D Preview (if wardrobe data available) */}
      {wardrobeData && isSceneLoaded && (
        <>
          <Card className="overflow-hidden">
            <div className="p-4 border-b flex items-center justify-between">
              <h2 className="text-lg font-semibold">3D Prikaz</h2>
              <ViewModeToggle />
            </div>
            <div className="h-[400px] sm:h-[500px]">
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
                disabled={!order.cutList}
              >
                <FileText className="h-4 w-4 mr-2" />
                Specifikacija PDF
              </Button>
              <Button
                variant="outline"
                onClick={handleExportCSV}
                disabled={!order.cutList}
              >
                <FileSpreadsheet className="h-4 w-4 mr-2" />
                CSV za CNC
              </Button>
            </div>
          </Card>
        </>
      )}

      {/* Cut List Section */}
      <Card className="p-6 space-y-4">
        <h2 className="text-lg font-semibold">Lista ploča za sečenje (CNC)</h2>
        {order.cutList && order.cutList.items.length > 0 ? (
          <CutListDisplay cutList={order.cutList} />
        ) : (
          <p className="text-muted-foreground text-sm">
            Podaci o pločama nisu dostupni za starije porudžbine.
          </p>
        )}
      </Card>
    </div>
  );
}

// Helper to group cut list items by element
function groupByElement(items: CutListItem[]): Record<string, CutListItem[]> {
  return items.reduce(
    (acc, item) => {
      const key = item.element;
      if (!acc[key]) acc[key] = [];
      acc[key].push(item);
      return acc;
    },
    {} as Record<string, CutListItem[]>,
  );
}

// Format number with 2 decimal places
function fmt2(n: number): string {
  return n.toLocaleString("sr-RS", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function CutListDisplay({ cutList }: { cutList: CutList }) {
  const grouped = groupByElement(cutList.items);
  const elements = Object.keys(grouped).sort();

  // Calculate totals
  const totalItems = cutList.items.length;
  const totalArea = cutList.items.reduce((sum, item) => sum + item.areaM2, 0);
  const totalCost = cutList.items.reduce((sum, item) => sum + item.cost, 0);

  return (
    <div className="space-y-4">
      {/* Summary row */}
      <div className="flex flex-wrap gap-4 text-sm">
        <div>
          <span className="text-muted-foreground">Ukupno ploča:</span>{" "}
          <span className="font-medium">{totalItems}</span>
        </div>
        <div>
          <span className="text-muted-foreground">Ukupna površina:</span>{" "}
          <span className="font-medium">{fmt2(totalArea)} m²</span>
        </div>
        <div>
          <span className="text-muted-foreground">Ukupna cena:</span>{" "}
          <span className="font-medium">{fmt2(totalCost)} RSD</span>
        </div>
      </div>

      {/* Accordion for each element */}
      <Accordion type="multiple" className="w-full">
        {elements.map((element) => {
          const items = grouped[element];
          const elementArea = items.reduce((sum, item) => sum + item.areaM2, 0);
          const elementCost = items.reduce((sum, item) => sum + item.cost, 0);

          return (
            <AccordionItem key={element} value={element}>
              <AccordionTrigger className="hover:no-underline">
                <div className="flex flex-1 items-center justify-between pr-4">
                  <span className="font-medium">Element {element}</span>
                  <div className="flex gap-4 text-sm text-muted-foreground">
                    <span>{items.length} ploča</span>
                    <span>{fmt2(elementArea)} m²</span>
                    <span>{fmt2(elementCost)} RSD</span>
                  </div>
                </div>
              </AccordionTrigger>
              <AccordionContent>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b text-muted-foreground">
                        <th className="text-left py-2 pr-2 font-medium">
                          Oznaka
                        </th>
                        <th className="text-left py-2 pr-2 font-medium">
                          Opis
                        </th>
                        <th className="text-right py-2 pr-2 font-medium">
                          Š (cm)
                        </th>
                        <th className="text-right py-2 pr-2 font-medium">
                          V (cm)
                        </th>
                        <th className="text-right py-2 pr-2 font-medium">
                          D (mm)
                        </th>
                        <th className="text-right py-2 pr-2 font-medium">m²</th>
                        <th className="text-right py-2 font-medium">Cena</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border/50">
                      {items.map((item, idx) => (
                        <tr key={`${item.code}-${idx}`}>
                          <td className="py-2 pr-2 font-mono text-xs">
                            {item.code}
                          </td>
                          <td className="py-2 pr-2">{item.desc}</td>
                          <td className="py-2 pr-2 text-right tabular-nums">
                            {fmt2(item.widthCm)}
                          </td>
                          <td className="py-2 pr-2 text-right tabular-nums">
                            {fmt2(item.heightCm)}
                          </td>
                          <td className="py-2 pr-2 text-right tabular-nums">
                            {fmt2(item.thicknessMm)}
                          </td>
                          <td className="py-2 pr-2 text-right tabular-nums">
                            {fmt2(item.areaM2)}
                          </td>
                          <td className="py-2 text-right tabular-nums">
                            {fmt2(item.cost)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                      <tr className="border-t font-medium">
                        <td colSpan={5} className="py-2 pr-2">
                          Ukupno za element {element}
                        </td>
                        <td className="py-2 pr-2 text-right tabular-nums">
                          {fmt2(elementArea)}
                        </td>
                        <td className="py-2 text-right tabular-nums">
                          {fmt2(elementCost)}
                        </td>
                      </tr>
                    </tfoot>
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
