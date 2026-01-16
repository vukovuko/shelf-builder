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
import { useShelfStore, type Material } from "@/lib/store";
import { applyWardrobeSnapshot } from "@/lib/serializeWardrobe";
import { exportCutListAsCsv } from "@/lib/exportCsv";
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
  const setMaterials = useShelfStore((state) => state.setMaterials);
  const viewMode = useShelfStore((state) => state.viewMode);
  const setViewMode = useShelfStore((state) => state.setViewMode);
  const setShowEdgesOnly = useShelfStore((state) => state.setShowEdgesOnly);

  const cameraMode = viewMode === "Sizing" ? "2D" : viewMode;
  const setCameraMode = (mode: "2D" | "3D") => setViewMode(mode);

  // Load wardrobe data into store for 3D preview
  useEffect(() => {
    if (wardrobeData && materials.length > 0) {
      setMaterials(materials);
      applyWardrobeSnapshot(wardrobeData);
      setIsSceneLoaded(true);
    }
  }, [wardrobeData, materials, setMaterials]);

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
      await new Promise((resolve) => setTimeout(resolve, 300));
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

  const handleDownloadTechnical2D = useCallback(async () => {
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
    link.download = `order-${order.orderNumber}-technical-2d.jpg`;
    link.click();
    setShowEdgesOnly(false);
    useShelfStore.getState().setShowDimensions(prevDims);
  }, [cameraMode, setCameraMode, setShowEdgesOnly, order.orderNumber]);

  // CSV export handler
  const handleExportCSV = useCallback(() => {
    if (order.cutList) {
      exportCutListAsCsv(
        order.cutList.items,
        `order-${order.orderNumber}-cut-list.csv`,
      );
    }
  }, [order.cutList, order.orderNumber]);

  // PDF export handler
  const handleExportPDF = useCallback(() => {
    if (!order.cutList) return;

    try {
      const doc = new jsPDF({ unit: "mm", format: "a4" });
      const pageH = 297;
      const margin = 12;
      const baseFont = 11;

      // Group items by element
      const grouped = order.cutList.items.reduce(
        (acc, item) => {
          if (!acc[item.element]) acc[item.element] = [];
          acc[item.element].push(item);
          return acc;
        },
        {} as Record<string, CutListItem[]>,
      );

      const elementKeys = Object.keys(grouped).sort();

      if (elementKeys.length === 0) {
        doc.text("Nema elemenata za specifikaciju.", margin, margin);
      }

      elementKeys.forEach((letter, idx) => {
        if (idx > 0) doc.addPage();
        doc.setFontSize(16);
        doc.text(`Specifikacija elementa ${letter}`, margin, margin + 4);
        doc.setFontSize(baseFont);

        const rows = grouped[letter];

        // Table headers
        const headers = [
          "Oznaka",
          "Opis",
          "Š (cm)",
          "V (cm)",
          "Deb (mm)",
          "m²",
          "Cena",
        ];
        const colX = [margin, 35, 80, 105, 130, 155, 175];
        const colW = [
          colX[1] - colX[0],
          colX[2] - colX[1],
          colX[3] - colX[2],
          colX[4] - colX[3],
          colX[5] - colX[4],
          colX[6] - colX[5],
          210 - margin - colX[6],
        ];

        let y = margin + 16;
        doc.setFont("helvetica", "bold");
        doc.setFontSize(9);
        headers.forEach((h, i) => {
          doc.text(h, colX[i] + 2, y);
          doc.rect(colX[i], y - 5, colW[i], 7, "S");
        });
        doc.setFont("helvetica", "normal");
        doc.setFontSize(8);
        y += 8;

        rows.forEach((it) => {
          const line = [
            it.code ?? "",
            String(it.desc ?? ""),
            fmt2(it.widthCm ?? 0),
            fmt2(it.heightCm ?? 0),
            fmt2(it.thicknessMm ?? 0),
            fmt2(it.areaM2 ?? 0),
            fmt2(it.cost ?? 0),
          ];
          // Wrap description if too long
          const descLines = doc.splitTextToSize(line[1], colW[1] - 4);
          const rowH = Math.max(7, (descLines.length || 1) * 4 + 3);
          doc.rect(colX[0], y - 5, colW[0], rowH, "S");
          doc.text(line[0], colX[0] + 2, y);
          doc.rect(colX[1], y - 5, colW[1], rowH, "S");
          doc.text(descLines, colX[1] + 2, y);
          doc.rect(colX[2], y - 5, colW[2], rowH, "S");
          doc.text(line[2], colX[2] + 2, y);
          doc.rect(colX[3], y - 5, colW[3], rowH, "S");
          doc.text(line[3], colX[3] + 2, y);
          doc.rect(colX[4], y - 5, colW[4], rowH, "S");
          doc.text(line[4], colX[4] + 2, y);
          doc.rect(colX[5], y - 5, colW[5], rowH, "S");
          doc.text(line[5], colX[5] + 2, y);
          doc.rect(colX[6], y - 5, colW[6], rowH, "S");
          doc.text(line[6], colX[6] + 2, y);
          y += rowH + 2;
          // Page break if near bottom
          if (y > pageH - margin - 10) {
            doc.addPage();
            y = margin + 10;
          }
        });

        // Footer totals for the element
        const elementArea = rows.reduce((a, b) => a + (b.areaM2 ?? 0), 0);
        const elementCost = rows.reduce((a, b) => a + (b.cost ?? 0), 0);
        y += 8;
        doc.setFont("helvetica", "bold");
        doc.text(`Ukupna kvadratura: ${fmt2(elementArea)} m²`, margin, y);
        doc.text(`Ukupna cena: ${fmt2(elementCost)} RSD`, margin + 90, y);
        doc.setFont("helvetica", "normal");
      });

      doc.save(`order-${order.orderNumber}-specifikacija.pdf`);
    } catch (e) {
      console.error("PDF export failed", e);
    }
  }, [order.cutList, order.orderNumber, fmt2]);

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
