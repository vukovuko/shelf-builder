"use client";

import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { useShelfStore } from "@/lib/store";
import { DimensionControl } from "./DimensionControl";
import { Button } from "./ui/button";
import materials from "@/data/materials.json";
import { Slider } from "@/components/ui/slider";


export function ConfiguratorControls() {
  const {
    width,
    height,
    depth,
    setWidth,
    setHeight,
    setDepth,
    numberOfColumns,
    setNumberOfColumns, // Get the new state and action
  } = useShelfStore();

  // Add these if not already in your store:
  const selectedMaterialId = useShelfStore(state => state.selectedMaterialId);
  const setSelectedMaterialId = useShelfStore(state => state.setSelectedMaterialId);

  const showDimensions = useShelfStore(state => state.showDimensions);
  const setShowDimensions = useShelfStore(state => state.setShowDimensions);

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
  <p className="text-sm text-muted-foreground">
    Izaberi broj vertikalnih prostora.
  </p>

  <div className="flex items-center space-x-4">
    {/* Minus button */}
    <Button
      variant="outline"
      onClick={() => setNumberOfColumns(numberOfColumns - 1)}
      disabled={numberOfColumns <= 0}
    >
      –
    </Button>

    {/* Slider */}
    <Slider
      min={1}
      max={8}
      step={1}
      value={[numberOfColumns]}
      onValueChange={([val]) => setNumberOfColumns(val)}
      className="w-full"
    />

    {/* Plus button */}
    <Button
      variant="outline"
      onClick={() => setNumberOfColumns(numberOfColumns + 1)}
      disabled={numberOfColumns >= 8}
    >
      +
    </Button>
  </div>

  <p className="text-sm text-muted-foreground text-center">
    Selected: {numberOfColumns} columns
  </p>

  {/* Sliders for each column width */}
  // Remove this from store.ts!
<div className="space-y-2">
  {useShelfStore(state => state.rowCounts).map((count, idx) => (
    <div key={idx} className="flex items-center space-x-2">
      <span className="text-xs text-muted-foreground">Shelves in Col {idx + 1}</span>
      <Button
        variant="outline"
        size="icon"
        onClick={() => useShelfStore.getState().setRowCount(idx, Math.max(count - 1, 0))}
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
        onValueChange={([val]) => useShelfStore.getState().setRowCount(idx, val)}
        className="flex-1"
      />
      <Button
        variant="outline"
        size="icon"
        onClick={() => useShelfStore.getState().setRowCount(idx, Math.min(count + 1, 10))}
        disabled={count >= 10}
        className="px-2"
      >
        +
      </Button>
      <span className="text-xs w-8 text-right">{count} shelves</span>
    </div>
  ))}
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
  <h4 className="text-sm font-semibold mb-2">Materijal Korpusa (18mm)</h4>
  <div className="grid grid-cols-3 gap-4">
    {materials
      .filter((m) => m.thickness === 18000) // for 18mm
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
      .filter((m) => m.thickness === 5000) // for 5mm
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
