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


export function ConfiguratorControls({ wardrobeRef }: { wardrobeRef: React.RefObject<any> }) {
  // Download 2D front view as JPG
  const setCameraMode = useShelfStore(state => state.setCameraMode);
  const cameraMode = useShelfStore(state => state.cameraMode);
  const setShowEdgesOnly = useShelfStore(state => state.setShowEdgesOnly);
  const showEdgesOnly = useShelfStore(state => state.showEdgesOnly);

  // Download front edges only as JPG
  const handleDownloadFrontEdges = React.useCallback(async () => {
    setShowEdgesOnly(true);
    if (cameraMode !== "2D") {
      setCameraMode("2D");
      await new Promise(resolve => setTimeout(resolve, 300));
    }
    await new Promise(requestAnimationFrame);
    const canvas = document.querySelector("canvas");
    if (!canvas) {
      setShowEdgesOnly(false);
      return;
    }
    const dataUrl = canvas.toDataURL("image/jpeg", 0.95);
    const link = document.createElement("a");
    link.href = dataUrl;
    link.download = "wardrobe-front-edges.jpg";
    link.click();
    setShowEdgesOnly(false);
  }, [cameraMode, setCameraMode, setShowEdgesOnly]);

  const handleDownloadFrontView = React.useCallback(async () => {
    if (cameraMode !== "2D") {
      setCameraMode("2D");
      await new Promise(resolve => setTimeout(resolve, 300));
    }
    const canvas = document.querySelector("canvas");
    if (!canvas) return;
    await new Promise(requestAnimationFrame);
    const dataUrl = canvas.toDataURL("image/jpeg", 0.95);
    const link = document.createElement("a");
    link.href = dataUrl;
    link.download = "wardrobe-front-view.jpg";
    link.click();
  }, [cameraMode, setCameraMode]);
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
  const setSelectedMaterialId = useShelfStore(state => state.setSelectedMaterialId);

  const showDimensions = useShelfStore(state => state.showDimensions);
  const setShowDimensions = useShelfStore(state => state.setShowDimensions);

  // State for global info toggle
  const [allInfoShown, setAllInfoShown] = React.useState(false);

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
      setAllInfoShown((prev) => !prev);
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
  const topH = hasSplitY ? (h - targetBottomH < minTopH ? minTopH : (h - targetBottomH)) : 0;
  const nModulesY = hasSplitY ? 2 : 1;
  const totalElements = nBlocksX * nModulesY;
  for (let i = 0; i < totalElements; i++) letters.push(toLetters(i));

  const selectedElementKey = useShelfStore(state => state.selectedElementKey);
  const setSelectedElementKey = useShelfStore(state => state.setSelectedElementKey);
  const elementConfigs = useShelfStore(state => state.elementConfigs);
  const setElementColumns = useShelfStore(state => state.setElementColumns);
  const setElementRowCount = useShelfStore(state => state.setElementRowCount);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2 items-center">
        <span className="text-sm text-muted-foreground">Element:</span>
        {letters.map((ltr, idx) => (
          <Button
            key={ltr}
            variant={selectedElementKey === ltr ? "default" : "outline"}
            onClick={() => setSelectedElementKey(ltr)}
            className="px-2 py-1 h-8"
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
              {(elementConfigs[selectedElementKey]?.columns ?? 1)}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="icon"
              onClick={() => {
                const curr = elementConfigs[selectedElementKey]?.columns ?? 1;
                setElementColumns(selectedElementKey, Math.max(curr - 1, 1));
              }}
              className="px-2"
            >
              –
            </Button>
            <Slider
              min={1}
              max={8}
              step={1}
              value={[elementConfigs[selectedElementKey]?.columns ?? 1]}
              onValueChange={([val]) => setElementColumns(selectedElementKey, val)}
              className="flex-1"
            />
            <Button
              variant="outline"
              size="icon"
              onClick={() => {
                const curr = elementConfigs[selectedElementKey]?.columns ?? 1;
                setElementColumns(selectedElementKey, Math.min(curr + 1, 8));
              }}
              className="px-2"
            >
              +
            </Button>
          </div>

          {/* Shelf sliders per compartment */}
          <div className="space-y-2">
            {Array.from({ length: elementConfigs[selectedElementKey]?.columns ?? 1 }).map((_, idx) => {
              const count = elementConfigs[selectedElementKey]?.rowCounts?.[idx] ?? 0;
              return (
                <div key={idx} className="flex items-center space-x-2">
                  <span className="text-xs text-muted-foreground">Shelves in Comp {idx + 1}</span>
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => setElementRowCount(selectedElementKey, idx, Math.max(count - 1, 0))}
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
                    onValueChange={([val]) => setElementRowCount(selectedElementKey, idx, val)}
                    className="flex-1"
                  />
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => setElementRowCount(selectedElementKey, idx, Math.min(count + 1, 10))}
                    disabled={count >= 10}
                    className="px-2"
                  >
                    +
                  </Button>
                  <span className="text-xs w-10 text-right">{count} shelves</span>
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

        <AccordionItem value="item-3" className="border-border">
          <AccordionTrigger className="text-base font-bold hover:no-underline">
            3. Choose material
          </AccordionTrigger>
          <AccordionContent className="space-y-6 pt-4">

{/* Materijal Korpusa */}
<div>
  <h4 className="text-sm font-semibold mb-2">Materijal Korpusa (10–25mm)</h4>
  <div className="grid grid-cols-3 gap-4">
    {materials
      .filter((m) => m.thickness >= 10 && m.thickness <= 25)
      .map((material) => (
        <div key={material.id} className="flex flex-col items-center">
          <button
            className={`rounded-lg border-2 ${selectedMaterialId === material.id ? "border-primary" : "border-transparent"} hover:border-primary h-24 w-full bg-cover bg-center`}
            style={{ backgroundImage: `url(${material.img})` }}
            onClick={() => setSelectedMaterialId(material.id)}
            title={material.name}
          >
            <span className="sr-only">{material.name}</span>
          </button>
          <span className="text-sm mt-1 text-center">{material.name}</span>
        </div>
      ))}
  </div>
</div>

{/* Materijal Leđa */}
<div>
  <h4 className="text-sm font-semibold mb-2">Materijal Leđa (5mm)</h4>
  <div className="grid grid-cols-3 gap-4">
    {materials
      .filter((m) => m.thickness === 5) // for 5mm
      .map((material) => (
        <div key={material.id} className="flex flex-col items-center">
          <button
            className="rounded-lg border-2 border-transparent hover:border-primary h-24 w-full bg-cover bg-center"
            style={{ backgroundImage: `url(${material.img})` }}
            // You can add a separate setter for back material if needed
            onClick={() => console.log("Odabrani materijal leđa:", material)}
            title={material.name}
          >
            <span className="sr-only">{material.name}</span>
          </button>
          <span className="text-sm mt-1 text-center">{material.name}</span>
        </div>
      ))}
  </div>
</div>

          </AccordionContent>
        </AccordionItem>
        {/* Global Show/Hide Info Button */}
        <div className="flex flex-col items-center gap-3 mt-6">
          <Button variant="outline" onClick={handleToggleAllInfo}>
            {allInfoShown ? "Hide All Info" : "Show All Info"}
          </Button>
          <Button variant="outline" onClick={handleDownloadFrontView}>
            Download Front View (JPG)
          </Button>
          <Button variant="outline" onClick={handleDownloadFrontEdges}>
            Download Front Edges (JPG)
          </Button>
        </div>
      </Accordion>
    </>
  );
}

// Example: Top-right controls (e.g. in Scene.tsx or AppBar.tsx)
export function TopRightControls() {
  const cameraMode = useShelfStore(state => state.cameraMode);
  const setCameraMode = useShelfStore(state => state.setCameraMode);
  const showDimensions = useShelfStore(state => state.showDimensions);
  const setShowDimensions = useShelfStore(state => state.setShowDimensions);

  return (
    <div style={{
      position: "absolute",
      top: 16,
      right: 16,
      display: "flex",
      gap: 8,
      zIndex: 10,
    }}>
      <button
        className={`px-3 py-1 rounded ${cameraMode === "2D" ? "bg-primary text-white" : "bg-white border"}`}
        onClick={() => setCameraMode("2D")}
      >
        2D
      </button>
      <button
        className={`px-3 py-1 rounded ${cameraMode === "3D" ? "bg-primary text-white" : "bg-white border"}`}
        onClick={() => setCameraMode("3D")}
      >
        3D
      </button>
      <button
        className={`px-3 py-1 rounded ${showDimensions ? "bg-primary text-white" : "bg-white border"}`}
        onClick={() => setShowDimensions(!showDimensions)}
      >
        {showDimensions ? "Hide Dimensions" : "Show Dimensions"}
      </button>
    </div>
  );
}
