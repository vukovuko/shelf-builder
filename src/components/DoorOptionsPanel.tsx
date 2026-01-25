"use client";

import { Button } from "@/components/ui/button";
import { useShelfStore, type DoorOption } from "@/lib/store";
import { X, DoorOpen, DoorClosed } from "lucide-react";
import {
  MIN_DOOR_HEIGHT_CM,
  MAX_DOOR_HEIGHT_CM,
} from "@/lib/wardrobe-constants";

interface DoorOptionsPanelProps {
  selectedKeys: string[];
  compartmentHeights: Record<string, number>; // key -> height in cm
}

export function DoorOptionsPanel({
  selectedKeys,
  compartmentHeights,
}: DoorOptionsPanelProps) {
  const setDoorForSelection = useShelfStore((s) => s.setDoorForSelection);
  const clearDoorSelection = useShelfStore((s) => s.clearDoorSelection);
  const doorSelections = useShelfStore((s) => s.doorSelections);

  // Calculate total height of selected compartments
  const totalHeightCm = selectedKeys.reduce(
    (sum, key) => sum + (compartmentHeights[key] ?? 0),
    0,
  );

  // Check if total height is within door constraints
  const canHaveDoor =
    totalHeightCm >= MIN_DOOR_HEIGHT_CM && totalHeightCm <= MAX_DOOR_HEIGHT_CM;

  // Get current door type for the selection (use first key's value if they differ)
  const currentDoorType =
    selectedKeys.length > 0 ? doorSelections[selectedKeys[0]] ?? "none" : "none";

  // Check if all selected compartments have the same door type
  const allSameDoor = selectedKeys.every(
    (key) => (doorSelections[key] ?? "none") === currentDoorType,
  );

  const handleDoorSelect = (type: DoorOption) => {
    setDoorForSelection(type);
  };

  const doorOptions: { key: DoorOption; label: string; icon?: React.ReactNode }[] =
    [
      { key: "none", label: "Bez vrata" },
      { key: "left", label: "Leva vrata", icon: <DoorClosed size={16} /> },
      { key: "right", label: "Desna vrata", icon: <DoorOpen size={16} /> },
    ];

  return (
    <div className="space-y-4">
      {/* Header with selection info */}
      <div className="flex items-center justify-between pb-2 border-b">
        <div>
          <span className="font-semibold text-lg">
            {selectedKeys.length > 1 ? "Pregrade" : "Pregrada"}
          </span>
          <span className="ml-2 text-muted-foreground">
            {selectedKeys.join(" + ")}
          </span>
        </div>
        <Button
          variant="ghost"
          size="icon"
          onClick={clearDoorSelection}
          className="h-8 w-8"
        >
          <X size={18} />
        </Button>
      </div>

      {/* Height info */}
      <div className="text-sm text-muted-foreground">
        <span>Ukupna visina: </span>
        <span
          className={
            canHaveDoor ? "text-foreground font-medium" : "text-destructive"
          }
        >
          {totalHeightCm}cm
        </span>
        {!canHaveDoor && (
          <span className="ml-2 text-xs">
            (dozvoljeno: {MIN_DOOR_HEIGHT_CM}-{MAX_DOOR_HEIGHT_CM}cm)
          </span>
        )}
      </div>

      {/* Door type selection */}
      {canHaveDoor ? (
        <div className="space-y-2">
          <p className="text-sm font-medium">Izaberite tip vrata:</p>
          <div className="grid grid-cols-1 gap-2">
            {doorOptions.map((option) => (
              <Button
                key={option.key}
                variant={
                  allSameDoor && currentDoorType === option.key
                    ? "default"
                    : "outline"
                }
                className="justify-start gap-2"
                onClick={() => handleDoorSelect(option.key)}
              >
                {option.icon}
                {option.label}
                {allSameDoor && currentDoorType === option.key && (
                  <span className="ml-auto text-xs opacity-70">izabrano</span>
                )}
              </Button>
            ))}
          </div>
        </div>
      ) : (
        <div className="py-4 text-center text-muted-foreground">
          <p className="text-sm">
            Visina nije odgovarajuća za vrata.
          </p>
          <p className="text-xs mt-1">
            Izaberite pregrade ukupne visine {MIN_DOOR_HEIGHT_CM}-{MAX_DOOR_HEIGHT_CM}cm.
          </p>
        </div>
      )}

      {/* Selection count info */}
      {selectedKeys.length > 1 && (
        <p className="text-xs text-muted-foreground text-center">
          Jedna vrata će prekriti {selectedKeys.length} pregrade
        </p>
      )}
    </div>
  );
}
