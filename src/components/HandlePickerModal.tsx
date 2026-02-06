"use client";

import { useState, useEffect, useMemo } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useShelfStore } from "@/lib/store";
import { Ban } from "lucide-react";

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
  // Get handles from store (database)
  const storeHandles = useShelfStore((s) => s.handles);

  // Local state for selection (before saving)
  const [localHandleId, setLocalHandleId] = useState<string>(
    selectedHandleId || "handle_1",
  );
  const [localFinish, setLocalFinish] = useState<string>(
    selectedFinish || "chrome",
  );

  // Get default handle ID (first available or "handle_1")
  const defaultHandleId = useMemo(() => {
    if (storeHandles.length > 0) {
      return storeHandles[0].legacyId || String(storeHandles[0].id);
    }
    return "handle_1";
  }, [storeHandles]);

  // Reset local state when modal opens
  useEffect(() => {
    if (open) {
      setLocalHandleId(selectedHandleId || defaultHandleId);
      setLocalFinish(selectedFinish || "chrome");
    }
  }, [open, selectedHandleId, selectedFinish, defaultHandleId]);

  // Helper to find handle by id or legacyId
  const findHandle = (handleId: string) => {
    return storeHandles.find(
      (h) => h.legacyId === handleId || String(h.id) === handleId,
    );
  };

  // Helper to get handle's effective ID (prefer legacyId for backward compatibility)
  const getHandleEffectiveId = (handle: (typeof storeHandles)[0]) => {
    return handle.legacyId || String(handle.id);
  };

  // Helper to get finish's effective ID (prefer legacyId for backward compatibility)
  const getFinishEffectiveId = (
    finish: (typeof storeHandles)[0]["finishes"][0],
  ) => {
    return finish.legacyId || String(finish.id);
  };

  // Get the currently selected handle's data
  const selectedHandle = findHandle(localHandleId);
  const availableFinishes = selectedHandle?.finishes || [];

  const isNone = localHandleId === "none";

  // When handle changes, auto-select first available finish if current isn't available
  useEffect(() => {
    if (isNone) return;
    if (selectedHandle) {
      const finishExists = selectedHandle.finishes.some(
        (f) => getFinishEffectiveId(f) === localFinish,
      );
      if (!finishExists && selectedHandle.finishes.length > 0) {
        setLocalFinish(getFinishEffectiveId(selectedHandle.finishes[0]));
      }
    }
  }, [localHandleId, selectedHandle, localFinish, isNone]);

  const handleSave = () => {
    onSelect(localHandleId, localFinish);
    onOpenChange(false);
  };

  // Get the selected finish for price display
  const selectedFinishData = availableFinishes.find(
    (f) => getFinishEffectiveId(f) === localFinish,
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
                {/* "No handle" option */}
                <button
                  type="button"
                  onClick={() => {
                    setLocalHandleId("none");
                    setLocalFinish("none");
                  }}
                  className={cn(
                    "flex flex-col rounded-lg border-2 overflow-hidden transition-all bg-card text-left hover:shadow-md",
                    isNone
                      ? "border-primary ring-2 ring-primary/20"
                      : "border-border hover:border-primary/50",
                  )}
                >
                  <div className="aspect-square bg-muted flex items-center justify-center">
                    <Ban className="w-12 h-12 text-muted-foreground/40" />
                  </div>
                  <div className="p-3 space-y-1">
                    <p className="text-sm font-medium">Bez ručke</p>
                    <p className="text-xs text-muted-foreground">
                      Vrata bez ručke
                    </p>
                  </div>
                </button>
                {storeHandles.map((handle) => {
                  const effectiveId = getHandleEffectiveId(handle);
                  return (
                    <button
                      key={handle.id}
                      type="button"
                      onClick={() => setLocalHandleId(effectiveId)}
                      className={cn(
                        "flex flex-col rounded-lg border-2 overflow-hidden transition-all bg-card text-left hover:shadow-md",
                        localHandleId === effectiveId
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
                  );
                })}
              </div>
            </div>

            {/* Right side - Finish selection */}
            <div className="flex-1 p-6">
              <h3 className="text-sm font-semibold mb-4 text-muted-foreground">
                Izbor završne obrade
              </h3>
              {isNone ? (
                <div className="text-center py-8 text-muted-foreground">
                  Bez ručke - nema završne obrade
                </div>
              ) : availableFinishes.length > 0 ? (
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                  {availableFinishes.map((finish) => {
                    const effectiveId = getFinishEffectiveId(finish);
                    return (
                      <button
                        key={finish.id}
                        type="button"
                        onClick={() => setLocalFinish(effectiveId)}
                        className={cn(
                          "flex flex-col rounded-lg border-2 overflow-hidden transition-all bg-card text-left hover:shadow-md",
                          localFinish === effectiveId
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
                            {finish.price.toLocaleString("sr-RS")} RSD
                          </p>
                        </div>
                      </button>
                    );
                  })}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  {storeHandles.length === 0
                    ? "Učitavanje ručki..."
                    : "Izaberite ručku za prikaz završnih obrada"}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Footer with save button */}
        <div className="px-6 py-4 border-t bg-muted/30 flex items-center justify-between">
          <div className="text-sm text-muted-foreground">
            {isNone ? (
              <span className="font-medium">Bez ručke</span>
            ) : (
              selectedHandle &&
              selectedFinishData && (
                <>
                  <span className="font-medium">{selectedHandle.name}</span>
                  {" • "}
                  <span>{selectedFinishData.name}</span>
                  {" • "}
                  <span className="font-medium">
                    {selectedFinishData.price.toLocaleString("sr-RS")} RSD
                  </span>
                </>
              )
            )}
          </div>
          <Button onClick={handleSave}>Sačuvaj</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
