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
import { useShelfStore, type Material } from "@/lib/store";
import { applyWardrobeSnapshot } from "@/lib/serializeWardrobe";

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
}: WardrobePreviewClientProps) {
  const wardrobeRef = useRef<any>(null);
  const [isLoaded, setIsLoaded] = useState(false);
  const setMaterials = useShelfStore((state) => state.setMaterials);

  // Store values for display
  const width = useShelfStore((state) => state.width);
  const height = useShelfStore((state) => state.height);
  const depth = useShelfStore((state) => state.depth);

  // For PDF export
  const viewMode = useShelfStore((state) => state.viewMode);
  const setViewMode = useShelfStore((state) => state.setViewMode);
  const setShowEdgesOnly = useShelfStore((state) => state.setShowEdgesOnly);
  const selectedMaterialId = useShelfStore((state) => state.selectedMaterialId);
  const selectedFrontMaterialId = useShelfStore(
    (state) => state.selectedFrontMaterialId,
  );
  const selectedBackMaterialId = useShelfStore(
    (state) => state.selectedBackMaterialId,
  );
  const elementConfigs = useShelfStore((state) => state.elementConfigs);
  const compartmentExtras = useShelfStore((state) => state.compartmentExtras);
  const doorSelections = useShelfStore((state) => state.doorSelections);
  const hasBase = useShelfStore((state) => state.hasBase);
  const baseHeight = useShelfStore((state) => state.baseHeight);

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
    link.download = `${wardrobe.name}-front-view.jpg`;
    link.click();
    useShelfStore.getState().setShowDimensions(prevDims);
  }, [cameraMode, setCameraMode, wardrobe.name]);

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
    link.download = `${wardrobe.name}-front-edges.jpg`;
    link.click();
    setShowEdgesOnly(false);
    useShelfStore.getState().setShowDimensions(prevDims);
  }, [cameraMode, setCameraMode, setShowEdgesOnly, wardrobe.name]);

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
    link.download = `${wardrobe.name}-technical-2d.jpg`;
    link.click();
    setShowEdgesOnly(false);
    useShelfStore.getState().setShowDimensions(prevDims);
  }, [cameraMode, setCameraMode, setShowEdgesOnly, wardrobe.name]);

  // CSV export handler
  const handleExportCSV = useCallback(() => {
    if (wardrobe.cutList) {
      exportCutListAsCsv(
        wardrobe.cutList.items,
        `${wardrobe.name}-cut-list.csv`,
      );
    }
  }, [wardrobe.cutList, wardrobe.name]);

  // PDF export handler (simplified version using stored cutList)
  const handleExportPDF = useCallback(() => {
    if (!wardrobe.cutList) return;

    try {
      const doc = new jsPDF({ unit: "mm", format: "a4" });
      const pageH = 297;
      const margin = 12;
      const baseFont = 11;

      // Group items by element
      const grouped = wardrobe.cutList.items.reduce(
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

      doc.save(`${wardrobe.name}-specifikacija.pdf`);
    } catch (e) {
      console.error("PDF export failed", e);
    }
  }, [wardrobe.cutList, wardrobe.name, fmt2]);

  // Load materials and wardrobe data on mount
  useEffect(() => {
    // Set materials first
    setMaterials(materials);

    // Then apply wardrobe snapshot
    if (wardrobe.data) {
      applyWardrobeSnapshot(wardrobe.data);
    }

    setIsLoaded(true);
  }, [materials, wardrobe.data, setMaterials]);

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
            <p className="text-sm text-muted-foreground">Pregled ormana</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <ViewModeToggle />
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
