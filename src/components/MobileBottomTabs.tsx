"use client";

import React, { useState } from "react";
import { Menu } from "lucide-react";
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
  StepAccessories,
} from "./configurator-steps";

interface MobileBottomTabsProps {
  materials: Material[];
  onOpenDrawer: () => void;
}

const TABS = [
  { key: "item-1", label: "Dimenzije" },
  { key: "item-2", label: "Kolone" },
  { key: "item-3", label: "Materijal" },
  { key: "item-4", label: "Baza" },
  { key: "item-5", label: "Vrata" },
  { key: "item-6", label: "Dodaci" },
  { key: "menu", label: "Meni" },
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
  const columnTopModuleShelves = useShelfStore(
    (s: ShelfState) => s.columnTopModuleShelves,
  );
  const slidingDoors = useShelfStore((s: ShelfState) => s.slidingDoors);
  const doorGroups = useShelfStore((s: ShelfState) => s.doorGroups);
  const globalHandleId = useShelfStore((s: ShelfState) => s.globalHandleId);
  const globalHandleFinish = useShelfStore(
    (s: ShelfState) => s.globalHandleFinish,
  );
  const storeHandles = useShelfStore((s: ShelfState) => s.handles);
  const storeAccessories = useShelfStore((s: ShelfState) => s.accessories);
  const selectedAccessories = useShelfStore(
    (s: ShelfState) => s.selectedAccessories,
  );
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
          columnTopModuleShelves,
          slidingDoors,
          doorGroups,
          globalHandleId,
          globalHandleFinish,
          doorSettingsMode,
          selectedAccessories,
        },
        materials,
        storeHandles,
        storeAccessories,
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
      storeAccessories,
      selectedAccessories,
      verticalBoundaries,
      columnHorizontalBoundaries,
      columnModuleBoundaries,
      columnTopModuleShelves,
      slidingDoors,
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
        <div className="bg-sidebar border-t border-sidebar-border max-h-[30vh] overflow-y-auto px-3 pb-2 animate-in slide-in-from-bottom-2 duration-200">
          {activeTab === "item-1" && <StepDimensions compact />}
          {activeTab === "item-2" && (
            <StepColumns materials={materials} compact />
          )}
          {activeTab === "item-3" && (
            <StepMaterials materials={materials} compact />
          )}
          {activeTab === "item-4" && <StepBase compact />}
          {activeTab === "item-5" && <StepDoors compact />}
          {activeTab === "item-6" && <StepAccessories />}
        </div>
      )}

      {/* Scrollable chip tab bar */}
      <div className="bg-sidebar border-t border-sidebar-border overflow-x-auto flex gap-1.5 px-2 py-1.5 [scrollbar-width:none] [-webkit-overflow-scrolling:touch] [&::-webkit-scrollbar]:hidden">
        {TABS.map(({ key, label }) => {
          const isActive = activeTab === key;
          const isMenu = key === "menu";
          return (
            <button
              key={key}
              type="button"
              onClick={() => handleTabClick(key)}
              className={`whitespace-nowrap px-3 py-1 rounded-full text-xs border transition-colors flex-shrink-0 ${
                isActive
                  ? "bg-primary text-primary-foreground border-primary"
                  : "bg-transparent text-muted-foreground border-border hover:text-foreground"
              }`}
            >
              {isMenu ? <Menu className="h-3.5 w-3.5" /> : label}
            </button>
          );
        })}
      </div>

      {/* 50:50 price | order footer */}
      <div className="bg-sidebar border-t border-sidebar-border grid grid-cols-2 safe-area-bottom">
        <div className="flex flex-col justify-center px-3 py-1.5">
          <span className="text-sm font-bold">
            {fmt2(cutList.totalCost)} RSD
          </span>
          <span className="text-[10px] text-muted-foreground">
            {fmt2(cutList.totalArea)} m²
          </span>
        </div>
        <button
          type="button"
          onClick={handleOrderClick}
          className="bg-accent text-accent-foreground font-bold uppercase text-sm hover:bg-accent/90 active:scale-95 transition-all"
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
