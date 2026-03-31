"use client";

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
  Lock,
  LockOpen,
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
import { calculateCutList, getCutListGroupKey } from "@/lib/calcCutList";
import type { SerializedAccessoryRule } from "@/lib/accessory-rules";
import { exportElementSpecs } from "@/lib/pdf/exportElementSpecs";
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

interface RuleAdjustment {
  ruleId: string;
  ruleName: string;
  actionType: string;
  description: string;
  amount: number;
  visible: boolean;
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
  wardrobeIsLocked: boolean | null;
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
  // Rule engine
  ruleAdjustments: RuleAdjustment[] | null;
  adjustedTotal: number | null;
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
  accessoryRules: SerializedAccessoryRule[];
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
  accessoryRules,
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
  const [isWardrobeLocked, setIsWardrobeLocked] = useState(
    order.wardrobeIsLocked ?? false,
  );

  async function handleToggleWardrobeLock() {
    if (!order.wardrobeId) return;
    const newLocked = !isWardrobeLocked;
    try {
      const res = await fetch(`/api/admin/wardrobes/${order.wardrobeId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isLocked: newLocked }),
      });
      if (res.ok) {
        setIsWardrobeLocked(newLocked);
        toast.success(newLocked ? "Orman je zaključan" : "Orman je otključan");
      } else {
        toast.error("Greška pri promeni statusa zaključavanja.");
      }
    } catch {
      toast.error("Greška pri promeni statusa zaključavanja.");
    }
  }

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
  // Structural data for accurate calculations
  const verticalBoundaries = useShelfStore(
    (state: ShelfState) => state.verticalBoundaries,
  );
  const columnHorizontalBoundaries = useShelfStore(
    (state: ShelfState) => state.columnHorizontalBoundaries,
  );
  const columnModuleBoundaries = useShelfStore(
    (state: ShelfState) => state.columnModuleBoundaries,
  );
  const columnTopModuleShelves = useShelfStore(
    (state: ShelfState) => state.columnTopModuleShelves,
  );
  // Door groups with per-door settings
  const doorGroups = useShelfStore((state: ShelfState) => state.doorGroups);
  const globalHandleId = useShelfStore(
    (state: ShelfState) => state.globalHandleId,
  );
  const globalHandleFinish = useShelfStore(
    (state: ShelfState) => state.globalHandleFinish,
  );
  const doorSettingsMode = useShelfStore(
    (state: ShelfState) => state.doorSettingsMode,
  );

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
          // Structural data
          verticalBoundaries,
          columnHorizontalBoundaries,
          columnModuleBoundaries,
          columnTopModuleShelves,
          // Door groups
          doorGroups,
          globalHandleId,
          globalHandleFinish,
          doorSettingsMode,
        },
        materials,
        [],
        [],
        accessoryRules,
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
      verticalBoundaries,
      columnHorizontalBoundaries,
      columnModuleBoundaries,
      columnTopModuleShelves,
      doorGroups,
      globalHandleId,
      globalHandleFinish,
      doorSettingsMode,
      materials,
      accessoryRules,
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
    link.download = `order-${order.orderNumber}-front-view.jpg`;
    link.click();
    useShelfStore.getState().setShowDimensions(prevDims);
  }, [cameraMode, setCameraMode, order.orderNumber]);

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
    if (!calculatedCutList || !calculatedCutList.grouped) return;

    exportElementSpecs(calculatedCutList, fmt2, materials, [], {
      filename: `order-${order.orderNumber}-specifikacija.pdf`,
    });
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
            <h1 className="text-2xl sm:text-3xl font-semibold">
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
                <div className="flex items-center gap-2">
                  <p className="font-medium">
                    {order.wardrobeName || (
                      <span className="text-muted-foreground">
                        Nije povezan
                      </span>
                    )}
                  </p>
                  {isWardrobeLocked && (
                    <span className="inline-flex items-center gap-1 text-xs text-amber-500">
                      <Lock className="h-3 w-3" />
                      Zaključan
                    </span>
                  )}
                </div>
                {order.wardrobeId && (
                  <div className="flex items-center gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={handleToggleWardrobeLock}
                      className="w-fit text-xs"
                    >
                      {isWardrobeLocked ? (
                        <LockOpen className="h-3.5 w-3.5 mr-1" />
                      ) : (
                        <Lock className="h-3.5 w-3.5 mr-1" />
                      )}
                      {isWardrobeLocked ? "Otključaj" : "Zaključaj"}
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      asChild
                      disabled={isWardrobeLocked}
                      className="w-fit border-accent text-accent hover:bg-accent/90 hover:text-white"
                    >
                      <Link
                        href={`/design?load=${order.wardrobeId}&fromOrder=${order.id}&orderNum=${order.orderNumber}`}
                      >
                        <Pencil className="h-3.5 w-3.5" />
                        Izmeni crtež
                      </Link>
                    </Button>
                  </div>
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
                        <td className="py-3 pr-2 font-semibold">
                          Osnovni materijal
                        </td>
                        <td className="py-3 pl-2 pr-3 text-right tabular-nums font-medium whitespace-nowrap">
                          {areaM2.toFixed(2)} m²
                        </td>
                        <td className="py-3 pl-3 text-right">
                          <div className="flex flex-col items-end leading-tight sm:flex-row sm:items-baseline sm:gap-1">
                            <span className="text-base sm:text-lg font-semibold tabular-nums">
                              {order.totalPrice.toLocaleString("sr-RS")}
                            </span>
                            <span className="text-xs sm:text-sm font-medium">
                              RSD
                            </span>
                          </div>
                        </td>
                      </tr>
                      {/* Show visible rule adjustments */}
                      {order.ruleAdjustments &&
                        order.ruleAdjustments
                          .filter((adj) => adj.visible)
                          .map((adj) => (
                            <tr key={adj.ruleId} className="text-sm">
                              <td className="py-2 pr-2" colSpan={2}>
                                {adj.description}
                              </td>
                              <td className="py-2 pl-3 text-right tabular-nums">
                                <span
                                  className={
                                    adj.amount < 0
                                      ? "text-green-600"
                                      : "text-orange-600"
                                  }
                                >
                                  {adj.amount < 0 ? "" : "+"}
                                  {adj.amount.toLocaleString("sr-RS")} RSD
                                </span>
                              </td>
                            </tr>
                          ))}
                      {/* Final total row when adjustments exist */}
                      {order.adjustedTotal !== null && (
                        <tr className="border-t border-border">
                          <td className="py-3 pr-2 font-semibold">
                            Konačna cena
                          </td>
                          <td className="py-3 pl-2 pr-3" />
                          <td className="py-3 pl-3 text-right">
                            <div className="flex flex-col items-end leading-tight sm:flex-row sm:items-baseline sm:gap-1">
                              <span className="text-lg sm:text-xl font-semibold tabular-nums text-primary">
                                {order.adjustedTotal.toLocaleString("sr-RS")}
                              </span>
                              <span className="text-xs sm:text-sm font-medium">
                                RSD
                              </span>
                            </div>
                          </td>
                        </tr>
                      )}
                    </tfoot>
                  </table>
                </div>
              </div>

              {/* Hidden rule adjustments (Interne stavke) */}
              {order.ruleAdjustments &&
                order.ruleAdjustments.filter((adj) => !adj.visible).length >
                  0 && (
                  <Accordion type="single" collapsible className="w-full">
                    <AccordionItem value="internal" className="border-none">
                      <AccordionTrigger className="py-2 text-sm text-muted-foreground hover:no-underline">
                        Interne stavke (
                        {
                          order.ruleAdjustments.filter((adj) => !adj.visible)
                            .length
                        }
                        )
                      </AccordionTrigger>
                      <AccordionContent>
                        <div className="rounded-lg border bg-muted/20 p-3 space-y-2">
                          {order.ruleAdjustments
                            .filter((adj) => !adj.visible)
                            .map((adj) => (
                              <div
                                key={adj.ruleId}
                                className="flex items-center justify-between text-sm"
                              >
                                <div>
                                  <span className="font-medium">
                                    {adj.description}
                                  </span>
                                  <span className="text-xs text-muted-foreground ml-2">
                                    ({adj.ruleName})
                                  </span>
                                </div>
                                <span className="tabular-nums">
                                  {adj.amount.toLocaleString("sr-RS")} RSD
                                </span>
                              </div>
                            ))}
                          <div className="border-t pt-2 flex justify-between text-sm font-medium">
                            <span>Ukupno interne stavke</span>
                            <span className="tabular-nums">
                              {order.ruleAdjustments
                                .filter((adj) => !adj.visible)
                                .reduce((sum, adj) => sum + adj.amount, 0)
                                .toLocaleString("sr-RS")}{" "}
                              RSD
                            </span>
                          </div>
                        </div>
                      </AccordionContent>
                    </AccordionItem>
                  </Accordion>
                )}
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
            <div className="h-[50vh] min-h-[350px] max-h-[500px]">
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
      const key = getCutListGroupKey(item.element);
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
