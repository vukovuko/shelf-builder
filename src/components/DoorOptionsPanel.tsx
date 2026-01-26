"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import {
  useShelfStore,
  type DoorOption,
  type ShelfState,
  type DoorGroup,
  type Material,
} from "@/lib/store";
import { X, DoorOpen, DoorClosed, Trash2, Square, Layers } from "lucide-react";
import {
  MIN_DOOR_HEIGHT_CM,
  MAX_DOOR_HEIGHT_CM,
} from "@/lib/wardrobe-constants";
import { MaterialPickerModal } from "./MaterialPickerModal";
import { HandlePickerModal } from "./HandlePickerModal";

interface DoorOptionsPanelProps {
  selectedKeys: string[];
  compartmentHeights: Record<string, number>; // key -> height in cm
}

export function DoorOptionsPanel({
  selectedKeys,
  compartmentHeights,
}: DoorOptionsPanelProps) {
  const setDoorForSelection = useShelfStore(
    (s: ShelfState) => s.setDoorForSelection,
  );
  const clearDoorSelection = useShelfStore(
    (s: ShelfState) => s.clearDoorSelection,
  );
  const doorSelections = useShelfStore((s: ShelfState) => s.doorSelections);
  const doorGroups = useShelfStore((s: ShelfState) => s.doorGroups);
  const removeDoorGroup = useShelfStore((s: ShelfState) => s.removeDoorGroup);

  // Material and handle settings
  const materials = useShelfStore((s: ShelfState) => s.materials);
  const storeHandles = useShelfStore((s: ShelfState) => s.handles);
  const selectedFrontMaterialId = useShelfStore(
    (s: ShelfState) => s.selectedFrontMaterialId,
  );
  const setSelectedFrontMaterialId = useShelfStore(
    (s: ShelfState) => s.setSelectedFrontMaterialId,
  );
  const globalHandleId = useShelfStore((s: ShelfState) => s.globalHandleId);
  const globalHandleFinish = useShelfStore(
    (s: ShelfState) => s.globalHandleFinish,
  );
  const setGlobalHandle = useShelfStore((s: ShelfState) => s.setGlobalHandle);
  const setGlobalHandleFinish = useShelfStore(
    (s: ShelfState) => s.setGlobalHandleFinish,
  );
  const doorSettingsMode = useShelfStore((s: ShelfState) => s.doorSettingsMode);
  const setDoorSettingsMode = useShelfStore(
    (s: ShelfState) => s.setDoorSettingsMode,
  );
  const setDoorMaterial = useShelfStore((s: ShelfState) => s.setDoorMaterial);
  const setDoorHandle = useShelfStore((s: ShelfState) => s.setDoorHandle);
  const setDoorHandleFinish = useShelfStore(
    (s: ShelfState) => s.setDoorHandleFinish,
  );

  // Material picker modal state
  const [isMaterialModalOpen, setIsMaterialModalOpen] = useState(false);
  // Handle picker modal state
  const [isHandleModalOpen, setIsHandleModalOpen] = useState(false);
  const [pinnedMaterialId, setPinnedMaterialId] = useState<number | undefined>(
    undefined,
  );

  // Filter materials for front/door category
  const frontMaterials = materials.filter((m: Material) =>
    m.categories.some(
      (c) =>
        c.toLowerCase().includes("lica") || c.toLowerCase().includes("vrata"),
    ),
  );

  // Get the category name for front materials
  const frontCategory =
    frontMaterials.length > 0
      ? (frontMaterials[0].categories.find(
          (c) =>
            c.toLowerCase().includes("lica") ||
            c.toLowerCase().includes("vrata"),
        ) ?? "Materijal za lica")
      : "Materijal za lica";

  // Calculate total height of selected compartments
  const totalHeightCm = selectedKeys.reduce(
    (sum, key) => sum + (compartmentHeights[key] ?? 0),
    0,
  );

  // Check if total height is within door constraints
  const canHaveDoor =
    totalHeightCm >= MIN_DOOR_HEIGHT_CM && totalHeightCm <= MAX_DOOR_HEIGHT_CM;

  // Check if this selection corresponds to an existing door group
  const existingGroup = doorGroups.find(
    (g: DoorGroup) =>
      g.compartments.length === selectedKeys.length &&
      g.compartments.every((c: string) => selectedKeys.includes(c)),
  );
  const isEditingExistingGroup = !!existingGroup;

  // Get current door type for the selection (use first key's value if they differ)
  const currentDoorType =
    selectedKeys.length > 0
      ? (doorSelections[selectedKeys[0]] ?? "none")
      : "none";

  // Check if all selected compartments have the same door type
  const allSameDoor = selectedKeys.every(
    (key) => (doorSelections[key] ?? "none") === currentDoorType,
  );

  // Get current material and handle for this door
  const currentMaterialId =
    doorSettingsMode === "per-door" && existingGroup?.materialId
      ? existingGroup.materialId
      : selectedFrontMaterialId;
  const currentHandleId =
    doorSettingsMode === "per-door" && existingGroup?.handleId
      ? existingGroup.handleId
      : globalHandleId;
  const currentHandleFinish =
    doorSettingsMode === "per-door" && existingGroup?.handleFinish
      ? existingGroup.handleFinish
      : globalHandleFinish;

  const isGlobalMode = doorSettingsMode === "global";

  // Get selected handle data for preview (supports both legacyId and numeric id)
  const selectedHandleData = storeHandles.find(
    (h) => h.legacyId === currentHandleId || String(h.id) === currentHandleId,
  );
  const selectedFinishData = selectedHandleData?.finishes.find(
    (f) =>
      f.legacyId === currentHandleFinish ||
      String(f.id) === currentHandleFinish,
  );

  const handleDoorSelect = (type: DoorOption) => {
    setDoorForSelection(type);
  };

  const handleRemoveDoor = () => {
    if (existingGroup) {
      removeDoorGroup(existingGroup.id);
    }
  };

  const handleMaterialSelect = (materialId: number) => {
    if (isGlobalMode) {
      // Global mode - update the global front material
      setSelectedFrontMaterialId(materialId);
    } else if (existingGroup) {
      // Per-door mode - update this specific door's material
      setDoorMaterial(existingGroup.id, materialId);
    }
    // Pin this material to first position
    setPinnedMaterialId(materialId);
  };

  const handleHandleSelect = (handleId: string, finishId: string) => {
    if (isGlobalMode) {
      // Global mode - update the global handle and finish
      setGlobalHandle(handleId);
      setGlobalHandleFinish(finishId);
    } else if (existingGroup) {
      // Per-door mode - update this specific door's handle and finish
      setDoorHandle(existingGroup.id, handleId);
      setDoorHandleFinish(existingGroup.id, finishId);
    }
  };

  // Sort materials so pinned one is first
  const sortedFrontMaterials = [...frontMaterials].sort((a, b) => {
    if (pinnedMaterialId !== undefined) {
      if (a.id === pinnedMaterialId) return -1;
      if (b.id === pinnedMaterialId) return 1;
    }
    // Put selected material first if no pinned
    if (a.id === currentMaterialId) return -1;
    if (b.id === currentMaterialId) return 1;
    return 0;
  });

  // Show only 3 materials in preview
  const previewMaterials = sortedFrontMaterials.slice(0, 3);
  const remainingMaterialsCount = frontMaterials.length - 3;

  const doorOptions: {
    key: DoorOption;
    label: string;
    icon?: React.ReactNode;
  }[] = [
    {
      key: "none",
      label: "Prazno",
      icon: <Square size={16} className="opacity-50" />,
    },
    { key: "left", label: "Leva vrata", icon: <DoorClosed size={16} /> },
    { key: "right", label: "Desna vrata", icon: <DoorOpen size={16} /> },
    {
      key: "drawerStyle",
      label: "Fioka",
      icon: <Layers size={16} />,
    },
    {
      key: "double",
      label: "Dupla vrata",
      icon: (
        <span className="flex gap-0.5">
          <DoorClosed size={14} />
          <DoorOpen size={14} />
        </span>
      ),
    },
    {
      key: "leftMirror",
      label: "Leva ogledalo vrata",
      icon: (
        <span className="relative">
          <DoorClosed size={16} />
          <span className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-blue-400 rounded-full" />
        </span>
      ),
    },
    {
      key: "rightMirror",
      label: "Desna ogledalo vrata",
      icon: (
        <span className="relative">
          <DoorOpen size={16} />
          <span className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-blue-400 rounded-full" />
        </span>
      ),
    },
    {
      key: "doubleMirror",
      label: "Dupla ogledalo vrata",
      icon: (
        <span className="flex gap-0.5 relative">
          <DoorClosed size={14} />
          <DoorOpen size={14} />
          <span className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-blue-400 rounded-full" />
        </span>
      ),
    },
  ];

  return (
    <div className="space-y-4">
      {/* Header with selection info */}
      <div className="flex items-center justify-between pb-2 border-b">
        <div>
          <span className="font-semibold text-lg">
            {isEditingExistingGroup
              ? "Vrata"
              : selectedKeys.length > 1
                ? "Pregrade"
                : "Pregrada"}
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
          <p className="text-sm font-medium">
            {isEditingExistingGroup
              ? "Promenite tip vrata:"
              : "Izaberite tip vrata:"}
          </p>
          <div className="grid grid-cols-2 gap-2">
            {doorOptions.map((option) => (
              <Button
                key={option.key}
                variant={
                  allSameDoor && currentDoorType === option.key
                    ? "default"
                    : "outline"
                }
                className="justify-start gap-2 text-xs px-2"
                onClick={() => handleDoorSelect(option.key)}
              >
                {option.icon}
                <span className="truncate">{option.label}</span>
              </Button>
            ))}
          </div>
        </div>
      ) : (
        <div className="py-4 text-center text-muted-foreground">
          <p className="text-sm">Visina nije odgovarajuća za vrata.</p>
          <p className="text-xs mt-1">
            Izaberite pregrade ukupne visine {MIN_DOOR_HEIGHT_CM}-
            {MAX_DOOR_HEIGHT_CM}cm.
          </p>
        </div>
      )}

      {/* Material and handle settings - only show when door exists */}
      {isEditingExistingGroup && existingGroup.type !== "none" && (
        <>
          {/* Global mode toggle - only for material and handles */}
          <div className="flex items-center justify-center space-x-2 py-2 px-3 bg-muted/50 rounded-md">
            <Checkbox
              id="global-mode"
              checked={isGlobalMode}
              onCheckedChange={(checked) =>
                setDoorSettingsMode(checked ? "global" : "per-door")
              }
            />
            <Label htmlFor="global-mode" className="text-sm cursor-pointer">
              Primeni materijal i ručke za sva vrata
            </Label>
          </div>

          {/* Material selector - Grid preview + popup like Step 3 */}
          <div className="space-y-3">
            <h4 className="text-sm font-semibold">Materijal za lica</h4>
            <div className="grid grid-cols-3 gap-2">
              {previewMaterials.map((material) => (
                <div key={material.id} className="flex flex-col items-center">
                  <button
                    type="button"
                    className={`rounded-lg border-2 ${
                      currentMaterialId === material.id
                        ? "border-primary"
                        : "border-transparent"
                    } hover:border-primary h-16 w-full bg-cover bg-center bg-muted`}
                    style={{
                      backgroundImage: material.img
                        ? `url(${material.img})`
                        : undefined,
                    }}
                    onClick={() => handleMaterialSelect(material.id)}
                    title={material.name}
                  >
                    <span className="sr-only">{material.name}</span>
                  </button>
                  <span className="text-xs mt-1 text-center truncate w-full">
                    {material.name}
                  </span>
                </div>
              ))}
            </div>
            {remainingMaterialsCount > 0 && (
              <Button
                variant="outline"
                size="sm"
                className="w-full"
                onClick={() => setIsMaterialModalOpen(true)}
              >
                Prikaži više ({remainingMaterialsCount})
              </Button>
            )}
            <MaterialPickerModal
              open={isMaterialModalOpen}
              onOpenChange={setIsMaterialModalOpen}
              category={frontCategory}
              materials={frontMaterials}
              selectedId={currentMaterialId}
              onSelect={(id) => {
                handleMaterialSelect(id);
              }}
            />
            {!isGlobalMode && (
              <p className="text-xs text-muted-foreground">
                Materijal samo za ova vrata
              </p>
            )}
          </div>

          {/* Handle selector - Preview + modal */}
          <div className="space-y-3">
            <h4 className="text-sm font-semibold">Ručke</h4>
            {/* Preview of selected handle */}
            <div className="flex items-center gap-3 p-3 border rounded-lg bg-muted/30">
              {selectedFinishData?.image ? (
                <div
                  className="w-16 h-16 rounded-md bg-cover bg-center bg-muted border"
                  style={{
                    backgroundImage: `url(${selectedFinishData.image})`,
                  }}
                />
              ) : (
                <div className="w-16 h-16 rounded-md bg-muted border flex items-center justify-center text-muted-foreground text-xs">
                  Ručka
                </div>
              )}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">
                  {selectedHandleData?.name || "Izaberite ručku"}
                </p>
                <p className="text-xs text-muted-foreground">
                  {selectedFinishData?.name || ""}
                </p>
                <p className="text-xs font-medium text-primary">
                  {selectedFinishData
                    ? `${selectedFinishData.price.toLocaleString("sr-RS")} RSD`
                    : ""}
                </p>
              </div>
            </div>
            <Button
              variant="outline"
              size="sm"
              className="w-full"
              onClick={() => setIsHandleModalOpen(true)}
            >
              Izaberi ručku
            </Button>
            <HandlePickerModal
              open={isHandleModalOpen}
              onOpenChange={setIsHandleModalOpen}
              selectedHandleId={currentHandleId}
              selectedFinish={currentHandleFinish}
              onSelect={handleHandleSelect}
            />
            {!isGlobalMode && (
              <p className="text-xs text-muted-foreground">
                Ručka samo za ova vrata
              </p>
            )}
          </div>
        </>
      )}

      {/* Remove door button - only show when editing existing group */}
      {isEditingExistingGroup && (
        <Button
          variant="destructive"
          className="w-full gap-2"
          onClick={handleRemoveDoor}
        >
          <Trash2 size={16} />
          Ukloni vrata
        </Button>
      )}

      {/* Selection count info */}
      {selectedKeys.length > 1 && !isEditingExistingGroup && (
        <p className="text-xs text-muted-foreground text-center">
          Jedna vrata će prekriti {selectedKeys.length} pregrade
        </p>
      )}
    </div>
  );
}
