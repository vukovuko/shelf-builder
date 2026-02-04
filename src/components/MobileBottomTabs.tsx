"use client";

import React, { useState } from "react";
import {
  Ruler,
  LayoutGrid,
  Palette,
  Square,
  DoorOpen,
  Menu,
} from "lucide-react";
import { toast } from "sonner";
import { useShelfStore, type Material, type ShelfState } from "@/lib/store";
import { calculateCutList } from "@/lib/calcCutList";
import { captureThumbnail } from "@/lib/captureThumbnail";
import { getWardrobeSnapshot } from "@/lib/serializeWardrobe";
import { CheckoutDialog } from "./CheckoutDialog";
import {
  StepDimensions,
  StepColumns,
  StepMaterials,
  StepBase,
  StepDoors,
} from "./configurator-steps";

interface MobileBottomTabsProps {
  materials: Material[];
  onOpenDrawer: () => void;
}

const TABS = [
  { key: "item-1", label: "Dimenzije", icon: Ruler },
  { key: "item-2", label: "Kolone", icon: LayoutGrid },
  { key: "item-3", label: "Materijal", icon: Palette },
  { key: "item-4", label: "Baza", icon: Square },
  { key: "item-5", label: "Vrata", icon: DoorOpen },
  { key: "menu", label: "Meni", icon: Menu },
] as const;

export function MobileBottomTabs({
  materials,
  onOpenDrawer,
}: MobileBottomTabsProps) {
  const activeTab = useShelfStore((s: ShelfState) => s.activeAccordionStep);
  const setActiveTab = useShelfStore(
    (s: ShelfState) => s.setActiveAccordionStep,
  );

  // CutList for footer price
  const width = useShelfStore((s: ShelfState) => s.width);
  const height = useShelfStore((s: ShelfState) => s.height);
  const depth = useShelfStore((s: ShelfState) => s.depth);
  const selectedMaterialId = useShelfStore(
    (s: ShelfState) => s.selectedMaterialId,
  );
  const selectedFrontMaterialId = useShelfStore(
    (s: ShelfState) => s.selectedFrontMaterialId,
  );
  const selectedBackMaterialId = useShelfStore(
    (s: ShelfState) => s.selectedBackMaterialId,
  );
  const elementConfigs = useShelfStore((s: ShelfState) => s.elementConfigs);
  const compartmentExtras = useShelfStore(
    (s: ShelfState) => s.compartmentExtras,
  );
  const doorSelections = useShelfStore((s: ShelfState) => s.doorSelections);
  const hasBase = useShelfStore((s: ShelfState) => s.hasBase);
  const baseHeight = useShelfStore((s: ShelfState) => s.baseHeight);
  const verticalBoundaries = useShelfStore(
    (s: ShelfState) => s.verticalBoundaries,
  );
  const columnHorizontalBoundaries = useShelfStore(
    (s: ShelfState) => s.columnHorizontalBoundaries,
  );
  const columnModuleBoundaries = useShelfStore(
    (s: ShelfState) => s.columnModuleBoundaries,
  );
  const doorGroups = useShelfStore((s: ShelfState) => s.doorGroups);
  const globalHandleId = useShelfStore((s: ShelfState) => s.globalHandleId);
  const globalHandleFinish = useShelfStore(
    (s: ShelfState) => s.globalHandleFinish,
  );
  const storeHandles = useShelfStore((s: ShelfState) => s.handles);
  const doorSettingsMode = useShelfStore((s: ShelfState) => s.doorSettingsMode);

  const cutList = React.useMemo(
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
          verticalBoundaries,
          columnHorizontalBoundaries,
          columnModuleBoundaries,
          doorGroups,
          globalHandleId,
          globalHandleFinish,
          doorSettingsMode,
        },
        materials,
        storeHandles,
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
      storeHandles,
      verticalBoundaries,
      columnHorizontalBoundaries,
      columnModuleBoundaries,
      doorGroups,
      globalHandleId,
      globalHandleFinish,
      doorSettingsMode,
    ],
  );

  // Checkout dialog state
  const [checkoutDialogOpen, setCheckoutDialogOpen] = useState(false);
  const [checkoutThumbnail, setCheckoutThumbnail] = useState<string | null>(
    null,
  );

  // Handle order click - same logic as desktop ConfiguratorControls
  const handleOrderClick = React.useCallback(async () => {
    // Validate that korpus material is selected and exists
    if (!selectedMaterialId) {
      toast.error(
        "Molimo izaberite materijal za korpus u sekciji 'Materijali'",
      );
      return;
    }
    const korpusMaterial = materials.find(
      (m) => String(m.id) === String(selectedMaterialId),
    );
    if (!korpusMaterial) {
      toast.error(
        "Izabrani materijal za korpus nije pronađen. Molimo izaberite ponovo.",
      );
      return;
    }

    // Validate that front material is selected and exists
    if (!selectedFrontMaterialId) {
      toast.error(
        "Molimo izaberite materijal za lica/vrata u sekciji 'Materijali'",
      );
      return;
    }
    const frontMaterial = materials.find(
      (m) => String(m.id) === String(selectedFrontMaterialId),
    );
    if (!frontMaterial) {
      toast.error(
        "Izabrani materijal za lica/vrata nije pronađen. Molimo izaberite ponovo.",
      );
      return;
    }

    // Capture thumbnail before opening dialog
    let thumbnail: string | null = null;
    const canvas = document.querySelector("canvas");
    if (canvas) {
      try {
        thumbnail = await captureThumbnail(canvas);
      } catch (e) {
        console.error("Failed to capture thumbnail for order", e);
      }
    }
    setCheckoutThumbnail(thumbnail);

    // Open checkout dialog
    setCheckoutDialogOpen(true);
  }, [materials, selectedMaterialId, selectedFrontMaterialId]);

  const fmt2 = React.useCallback(
    (n: number) =>
      Number(n ?? 0).toLocaleString(undefined, {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      }),
    [],
  );

  const handleTabClick = (key: string) => {
    if (key === "menu") {
      // Close any open tab panel, open the full drawer
      setActiveTab(null);
      onOpenDrawer();
      return;
    }
    // Toggle: tap active tab to collapse
    setActiveTab(activeTab === key ? null : key);
  };

  const isStepTab = activeTab !== null && activeTab !== "menu";

  return (
    <div className="md:hidden fixed bottom-0 inset-x-0 z-30 flex flex-col">
      {/* Expandable step panel */}
      {isStepTab && (
        <div className="bg-sidebar border-t border-sidebar-border max-h-[35vh] overflow-y-auto px-3 pb-2 animate-in slide-in-from-bottom-2 duration-200">
          {activeTab === "item-1" && <StepDimensions compact />}
          {activeTab === "item-2" && (
            <StepColumns materials={materials} compact />
          )}
          {activeTab === "item-3" && (
            <StepMaterials materials={materials} compact />
          )}
          {activeTab === "item-4" && <StepBase compact />}
          {activeTab === "item-5" && <StepDoors compact />}
        </div>
      )}

      {/* Tab bar */}
      <div className="bg-sidebar border-t border-sidebar-border flex items-center justify-around px-1 py-1.5 safe-area-bottom">
        {TABS.map(({ key, label, icon: Icon }) => {
          const isActive = activeTab === key;
          return (
            <button
              key={key}
              type="button"
              onClick={() => handleTabClick(key)}
              className={`flex flex-col items-center gap-0.5 px-1.5 py-1 rounded-md text-[10px] min-w-0 transition-colors ${
                isActive
                  ? "text-primary bg-primary/10"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <Icon className="h-5 w-5 flex-shrink-0" />
              <span className="truncate">{label}</span>
            </button>
          );
        })}
      </div>

      {/* Compact price footer with order button */}
      <div className="bg-sidebar border-t border-sidebar-border px-3 py-2 flex items-center gap-2 safe-area-bottom">
        <div className="flex-1 flex flex-col">
          <span className="text-xs text-muted-foreground">
            {fmt2(cutList.totalArea)} m²
          </span>
          <span className="text-sm font-bold">
            {fmt2(cutList.totalCost)} RSD
          </span>
        </div>
        <button
          type="button"
          onClick={handleOrderClick}
          className="px-4 py-2 bg-accent text-accent-foreground rounded-lg font-bold uppercase text-sm hover:bg-accent/90 active:scale-95 transition-all"
        >
          Poruči
        </button>
      </div>

      {/* Checkout Dialog */}
      <CheckoutDialog
        open={checkoutDialogOpen}
        onOpenChange={setCheckoutDialogOpen}
        orderData={{
          wardrobeSnapshot: getWardrobeSnapshot(),
          thumbnail: checkoutThumbnail,
          materialId: selectedMaterialId,
          materialName:
            materials.find((m) => String(m.id) === String(selectedMaterialId))
              ?.name ?? "",
          materialProductCode:
            materials.find((m) => String(m.id) === String(selectedMaterialId))
              ?.productCode ?? null,
          frontMaterialId: selectedFrontMaterialId!,
          frontMaterialName:
            materials.find(
              (m) => String(m.id) === String(selectedFrontMaterialId),
            )?.name ?? "",
          frontMaterialProductCode:
            materials.find(
              (m) => String(m.id) === String(selectedFrontMaterialId),
            )?.productCode ?? null,
          backMaterialId: selectedBackMaterialId ?? null,
          backMaterialName: selectedBackMaterialId
            ? (materials.find(
                (m) => String(m.id) === String(selectedBackMaterialId),
              )?.name ?? null)
            : null,
          backMaterialProductCode: selectedBackMaterialId
            ? (materials.find(
                (m) => String(m.id) === String(selectedBackMaterialId),
              )?.productCode ?? null)
            : null,
          totalArea: Math.round(cutList.totalArea * 10000), // Convert m² to cm²
          totalPrice: cutList.totalCost,
          priceBreakdown: cutList.priceBreakdown,
          dimensions: {
            width,
            height,
            depth,
          },
        }}
      />
    </div>
  );
}
