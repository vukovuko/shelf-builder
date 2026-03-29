"use client";

import React, {
  useEffect,
  useRef,
  useState,
  useCallback,
  useMemo,
} from "react";
import Link from "next/link";
import { toast } from "sonner";
import {
  ArrowLeft,
  Calendar,
  User,
  Ruler,
  Download,
  FileText,
  FileSpreadsheet,
  Lock,
  LockOpen,
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
import { useShelfStore, type Material, type ShelfState } from "@/lib/store";
import { applyWardrobeSnapshot } from "@/lib/serializeWardrobe";
import { exportElementSpecs } from "@/lib/pdf/exportElementSpecs";
import {} from "@/lib/wardrobe-constants";

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
    isLocked: boolean | null;
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
  const [isLocked, setIsLocked] = useState(wardrobe.isLocked ?? false);

  async function handleToggleLock() {
    const newLocked = !isLocked;
    try {
      const res = await fetch(`/api/admin/wardrobes/${wardrobe.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isLocked: newLocked }),
      });
      if (res.ok) {
        setIsLocked(newLocked);
        toast.success(newLocked ? "Orman je zaključan" : "Orman je otključan");
      } else {
        toast.error("Greška pri promeni statusa zaključavanja.");
      }
    } catch {
      toast.error("Greška pri promeni statusa zaključavanja.");
    }
  }
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
    if (!cutList || !cutList.grouped) return;

    exportElementSpecs(cutList, fmt2, materials, [], {
      filename: `${wardrobe.name}-specifikacija.pdf`,
    });
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
                  <h1 className="text-2xl sm:text-3xl font-semibold truncate cursor-pointer">
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
              {isLocked && (
                <Badge
                  variant="outline"
                  className="text-amber-500 border-amber-500/50"
                >
                  <Lock className="h-3 w-3 mr-1" />
                  Zaključan
                </Badge>
              )}
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
          <Button
            variant={isLocked ? "default" : "outline"}
            onClick={handleToggleLock}
          >
            {isLocked ? (
              <LockOpen className="h-4 w-4 mr-2" />
            ) : (
              <Lock className="h-4 w-4 mr-2" />
            )}
            {isLocked ? "Otključaj" : "Zaključaj"}
          </Button>
          {linkedOrders.length > 0 ? (
            <Button variant="default" asChild disabled={isLocked}>
              <Link href={`/admin/orders/${linkedOrders[0].id}`}>
                <Pencil className="h-4 w-4 mr-2" />
                Uredi preko porudžbine #{linkedOrders[0].orderNumber}
              </Link>
            </Button>
          ) : (
            <Button variant="default" asChild disabled={isLocked}>
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
        <div className="h-[60vh] min-h-[400px] max-h-[700px]">
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
