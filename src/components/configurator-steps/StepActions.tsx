"use client";

import { useEffect, useState } from "react";
import {
  Check,
  Download,
  Eye,
  EyeOff,
  FileText,
  Save,
  Table,
} from "lucide-react";
import { useShelfStore, type ShelfState } from "@/lib/store";
import { Button } from "../ui/button";

interface StepActionsProps {
  onSaveClick: () => void;
  onShowCutList: () => void;
  onExportElementSpecs: () => void;
  onDownloadFrontView: () => void;
  onDownloadFrontEdges: () => void;
  onDownloadTechnical2D: () => void;
}

export function StepActions({
  onSaveClick,
  onShowCutList,
  onExportElementSpecs,
  onDownloadFrontView,
  onDownloadFrontEdges,
  onDownloadTechnical2D,
}: StepActionsProps) {
  const showDimensions = useShelfStore((s: ShelfState) => s.showDimensions);
  const setShowDimensions = useShelfStore(
    (s: ShelfState) => s.setShowDimensions,
  );
  const lastSaveTime = useShelfStore((s: ShelfState) => s.lastSaveTime);

  // Show "Saved" indicator for 3 seconds after save
  const [showSaved, setShowSaved] = useState(false);
  useEffect(() => {
    if (lastSaveTime) {
      setShowSaved(true);
      const timer = setTimeout(() => setShowSaved(false), 3000);
      return () => clearTimeout(timer);
    }
  }, [lastSaveTime]);

  return (
    <div className="flex flex-col gap-4 mt-6">
      {/* Primary Actions */}
      <div className="flex flex-col gap-1">
        <Button
          variant="default"
          onClick={onSaveClick}
          className="w-full"
          size="lg"
        >
          <Save className="h-4 w-4 mr-2" />
          Sačuvaj dizajn
        </Button>
        {/* Saved indicator - subtle feedback */}
        <div
          className={`flex items-center justify-center gap-1.5 h-5 text-xs text-muted-foreground transition-opacity duration-300 ${showSaved ? "opacity-100" : "opacity-0"}`}
        >
          <Check className="h-3 w-3 text-green-500" />
          <span>Sačuvano</span>
        </div>
      </div>

      {/* View Controls */}
      <div className="space-y-2">
        <p className="text-xs font-medium text-muted-foreground px-1">Prikaz</p>
        <Button
          variant={showDimensions ? "secondary" : "ghost"}
          onClick={() => setShowDimensions(!showDimensions)}
          className="w-full justify-start"
          size="sm"
        >
          {showDimensions ? (
            <EyeOff className="h-4 w-4 mr-2" />
          ) : (
            <Eye className="h-4 w-4 mr-2" />
          )}
          {showDimensions ? "Sakrij Mere" : "Prikaži Mere"}
        </Button>
      </div>

      {/* Reports & Data */}
      <div className="space-y-2">
        <p className="text-xs font-medium text-muted-foreground px-1">
          Izveštaji
        </p>
        <div className="flex flex-col gap-2">
          <Button
            variant="secondary"
            onClick={onShowCutList}
            className="w-full justify-start"
            size="sm"
          >
            <Table className="h-4 w-4 mr-2" />
            Tabela ploča
          </Button>
          <Button
            variant="secondary"
            onClick={onExportElementSpecs}
            className="w-full justify-between"
            size="sm"
          >
            <span className="flex items-center">
              <FileText className="h-4 w-4 mr-2" />
              Specifikacija elemenata
            </span>
            <Download className="h-3 w-3 opacity-50" />
          </Button>
        </div>
      </div>

      {/* Downloads */}
      <div className="space-y-2">
        <p className="text-xs font-medium text-muted-foreground px-1">
          Preuzimanja
        </p>
        <div className="flex flex-col gap-2">
          <Button
            variant="outline"
            onClick={onDownloadFrontView}
            className="w-full justify-start"
            size="sm"
          >
            <Download className="h-4 w-4 mr-2" />
            Frontalni prikaz
          </Button>
          <Button
            variant="outline"
            onClick={onDownloadFrontEdges}
            className="w-full justify-start"
            size="sm"
          >
            <Download className="h-4 w-4 mr-2" />
            Ivice (front)
          </Button>
          <Button
            variant="outline"
            onClick={onDownloadTechnical2D}
            className="w-full justify-start"
            size="sm"
          >
            <Download className="h-4 w-4 mr-2" />
            Tehnički crtež 2D
          </Button>
        </div>
      </div>
    </div>
  );
}
