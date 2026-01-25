"use client";

import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import handlesData from "@/lib/handles.json";

interface HandleFinish {
  id: string;
  name: string;
  image: string;
  price: number;
}

interface Handle {
  id: string;
  name: string;
  description: string;
  mainImage: string;
  finishes: HandleFinish[];
}

const handles: Handle[] = handlesData.handles;

interface HandlePickerModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedHandleId: string | undefined;
  selectedFinish: string | undefined;
  onSelect: (handleId: string, finishId: string) => void;
}

export function HandlePickerModal({
  open,
  onOpenChange,
  selectedHandleId,
  selectedFinish,
  onSelect,
}: HandlePickerModalProps) {
  // Local state for selection (before saving)
  const [localHandleId, setLocalHandleId] = useState<string>(
    selectedHandleId || "handle_1",
  );
  const [localFinish, setLocalFinish] = useState<string>(
    selectedFinish || "chrome",
  );

  // Reset local state when modal opens
  useEffect(() => {
    if (open) {
      setLocalHandleId(selectedHandleId || "handle_1");
      setLocalFinish(selectedFinish || "chrome");
    }
  }, [open, selectedHandleId, selectedFinish]);

  // Get the currently selected handle's data
  const selectedHandle = handles.find((h) => h.id === localHandleId);
  const availableFinishes = selectedHandle?.finishes || [];

  // When handle changes, auto-select first available finish if current isn't available
  useEffect(() => {
    if (selectedHandle) {
      const finishExists = selectedHandle.finishes.some(
        (f) => f.id === localFinish,
      );
      if (!finishExists && selectedHandle.finishes.length > 0) {
        setLocalFinish(selectedHandle.finishes[0].id);
      }
    }
  }, [localHandleId, selectedHandle, localFinish]);

  const handleSave = () => {
    onSelect(localHandleId, localFinish);
    onOpenChange(false);
  };

  // Get the selected finish for price display
  const selectedFinishData = availableFinishes.find(
    (f) => f.id === localFinish,
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[95vw] max-w-[calc(100%-2rem)] sm:max-w-[900px] h-[90vh] max-h-[850px] flex flex-col p-0">
        <DialogHeader className="px-6 pt-6 pb-4 border-b">
          <DialogTitle className="text-xl">Izbor ručke</DialogTitle>
          <DialogDescription className="sr-only">
            Izaberite ručku i završnu obradu
          </DialogDescription>
        </DialogHeader>

        {/* Main content - two columns */}
        <div className="flex-1 overflow-y-auto">
          <div className="flex flex-col md:flex-row h-full">
            {/* Left side - Handle types */}
            <div className="flex-1 p-6 border-b md:border-b-0 md:border-r">
              <h3 className="text-sm font-semibold mb-4 text-muted-foreground">
                Ručke
              </h3>
              <div className="grid grid-cols-2 gap-4">
                {handles.map((handle) => (
                  <button
                    key={handle.id}
                    type="button"
                    onClick={() => setLocalHandleId(handle.id)}
                    className={cn(
                      "flex flex-col rounded-lg border-2 overflow-hidden transition-all bg-card text-left hover:shadow-md",
                      localHandleId === handle.id
                        ? "border-primary ring-2 ring-primary/20"
                        : "border-border hover:border-primary/50",
                    )}
                  >
                    <div
                      className="aspect-square bg-cover bg-center bg-muted"
                      style={{
                        backgroundImage: handle.mainImage
                          ? `url(${handle.mainImage})`
                          : undefined,
                      }}
                    />
                    <div className="p-3 space-y-1">
                      <p className="text-sm font-medium">{handle.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {handle.description}
                      </p>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Right side - Finish selection */}
            <div className="flex-1 p-6">
              <h3 className="text-sm font-semibold mb-4 text-muted-foreground">
                Izbor završne obrade
              </h3>
              {availableFinishes.length > 0 ? (
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                  {availableFinishes.map((finish) => (
                    <button
                      key={finish.id}
                      type="button"
                      onClick={() => setLocalFinish(finish.id)}
                      className={cn(
                        "flex flex-col rounded-lg border-2 overflow-hidden transition-all bg-card text-left hover:shadow-md",
                        localFinish === finish.id
                          ? "border-primary ring-2 ring-primary/20"
                          : "border-border hover:border-primary/50",
                      )}
                    >
                      <div
                        className="aspect-square bg-cover bg-center bg-muted"
                        style={{
                          backgroundImage: finish.image
                            ? `url(${finish.image})`
                            : undefined,
                        }}
                      />
                      <div className="p-2 space-y-0.5">
                        <p className="text-sm font-medium">{finish.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {finish.price.toLocaleString("sr-RS")} €
                        </p>
                      </div>
                    </button>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  Izaberite ručku za prikaz završnih obrada
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Footer with save button */}
        <div className="px-6 py-4 border-t bg-muted/30 flex items-center justify-between">
          <div className="text-sm text-muted-foreground">
            {selectedHandle && selectedFinishData && (
              <>
                <span className="font-medium">{selectedHandle.name}</span>
                {" • "}
                <span>{selectedFinishData.name}</span>
                {" • "}
                <span className="font-medium">
                  {selectedFinishData.price.toLocaleString("sr-RS")} €
                </span>
              </>
            )}
          </div>
          <Button onClick={handleSave}>Sačuvaj</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
