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

  return (
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
            Select the number of vertical compartments.
          </p>
          <div className="grid grid-cols-3 gap-2">
            {[2, 3, 4].map(cols => (
              <Button
                key={cols}
                variant={numberOfColumns === cols ? "secondary" : "outline"}
                onClick={() => setNumberOfColumns(cols)}
                className="group"
              >
                <span className="group-hover:text-primary">{cols}</span>
              </Button>
            ))}
          </div>
        </AccordionContent>
      </AccordionItem>

      <AccordionItem value="item-3" className="border-border">
        <AccordionTrigger className="text-base font-bold hover:no-underline">
          3. Choose material
        </AccordionTrigger>
        <AccordionContent>Placeholder for material options.</AccordionContent>
      </AccordionItem>
    </Accordion>
  );
}
