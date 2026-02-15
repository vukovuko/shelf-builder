"use client";

import { useEffect, useMemo } from "react";
import { useShelfStore, type ShelfState } from "@/lib/store";

export function StepAccessories() {
  const accessories = useShelfStore((s: ShelfState) => s.accessories);
  const selectedAccessories = useShelfStore(
    (s: ShelfState) => s.selectedAccessories,
  );
  const setSelectedAccessory = useShelfStore(
    (s: ShelfState) => s.setSelectedAccessory,
  );
  const compartmentExtras = useShelfStore(
    (s: ShelfState) => s.compartmentExtras,
  );
  const elementConfigs = useShelfStore((s: ShelfState) => s.elementConfigs);
  const doorGroups = useShelfStore((s: ShelfState) => s.doorGroups);
  const slidingDoors = useShelfStore((s: ShelfState) => s.slidingDoors);

  // Count total drawers from BOTH sources (matches checkout route logic)
  const totalDrawers = useMemo(() => {
    let count = 0;
    // 1. elementConfigs.drawerCounts (per-sub-column drawers — primary source)
    for (const cfg of Object.values(elementConfigs)) {
      if (Array.isArray(cfg.drawerCounts)) {
        for (const c of cfg.drawerCounts) count += c ?? 0;
      }
    }
    // 2. compartmentExtras.drawersCount (whole-compartment drawers)
    for (const extras of Object.values(compartmentExtras)) {
      if (extras.drawersCount) count += extras.drawersCount;
    }
    return count;
  }, [elementConfigs, compartmentExtras]);

  // Count total door leaves across all door groups
  const totalDoorLeaves = useMemo(() => {
    let count = 0;
    for (const group of doorGroups) {
      if (group.type === "double" || group.type === "doubleMirror") {
        count += 2;
      } else if (group.type !== "none") {
        count += 1;
      }
    }
    return count;
  }, [doorGroups]);

  // Hide entire accessories when irrelevant
  const visibleAccessories = useMemo(() => {
    return accessories.filter((acc) => {
      const nameLower = acc.name.toLowerCase();
      const isSarke = nameLower.includes("šark") || nameLower.includes("sark");
      const isKlizaci =
        nameLower.includes("klizač") || nameLower.includes("klizac");

      // Šarke: need regular doors (not sliding)
      if (isSarke && (slidingDoors || totalDoorLeaves === 0)) return false;

      // Klizači: need drawers OR sliding doors
      if (isKlizaci && totalDrawers === 0 && !slidingDoors) return false;

      // Generic fallback for any future accessories with pricing rules
      if (acc.pricingRule === "perDoor" && totalDoorLeaves === 0) return false;
      if (
        acc.pricingRule === "perDrawer" &&
        totalDrawers === 0 &&
        !slidingDoors
      )
        return false;

      return true;
    });
  }, [accessories, totalDoorLeaves, totalDrawers, slidingDoors]);

  // Filter variants: sliding door variants only when slidingDoors is on, hide them otherwise
  const filterVariants = (variants: (typeof accessories)[0]["variants"]) => {
    const hasSlidingVariant = variants.some((v) =>
      v.name.toLowerCase().includes("klizna vrata"),
    );
    if (!hasSlidingVariant) return variants;
    return variants.filter((v) => {
      const isSliding = v.name.toLowerCase().includes("klizna vrata");
      return slidingDoors ? isSliding : !isSliding;
    });
  };

  // Auto-select first visible variant for visible accessories, clear hidden ones
  useEffect(() => {
    for (const acc of accessories) {
      const isVisible = visibleAccessories.some((va) => va.id === acc.id);
      if (!isVisible) {
        if (selectedAccessories[acc.id] != null) {
          setSelectedAccessory(acc.id, null);
        }
        continue;
      }
      const visible = filterVariants(acc.variants);
      if (visible.length === 0) continue;
      const currentSelection = selectedAccessories[acc.id];
      const isCurrentVisible = visible.some((v) => v.id === currentSelection);
      if (currentSelection == null || !isCurrentVisible) {
        setSelectedAccessory(acc.id, visible[0].id);
      }
    }
  }, [
    accessories,
    visibleAccessories,
    selectedAccessories,
    setSelectedAccessory,
    slidingDoors,
  ]);

  if (visibleAccessories.length === 0) {
    return (
      <div className="py-8 text-center">
        <p className="text-sm text-muted-foreground">
          Nema potrebnih dodataka za trenutnu konfiguraciju
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-5 pt-3">
      {visibleAccessories.map((accessory) => {
        const selectedVariantId = selectedAccessories[accessory.id] ?? null;

        return (
          <div key={accessory.id} className="space-y-2.5">
            {/* Accessory header */}
            <div>
              <h3 className="text-sm font-semibold">{accessory.name}</h3>
              {accessory.description && (
                <p className="text-xs text-muted-foreground">
                  {accessory.description}
                </p>
              )}
              {accessory.pricingRule === "perDrawer" && (
                <p className="text-xs text-muted-foreground italic">
                  Dodaje se na svaku fioku
                </p>
              )}
              {accessory.pricingRule === "perDoor" && (
                <p className="text-xs text-muted-foreground italic">
                  Dodaje se na svaka vrata
                </p>
              )}
            </div>

            {/* Variant selection grid */}
            <div className="grid grid-cols-2 gap-2">
              {/* Variant options (filtered by sliding doors state) */}
              {filterVariants(accessory.variants).map((variant) => {
                const isSelected = selectedVariantId === variant.id;

                return (
                  <button
                    key={variant.id}
                    type="button"
                    onClick={() =>
                      setSelectedAccessory(accessory.id, variant.id)
                    }
                    className={`flex items-center gap-2 rounded-lg border p-2.5 text-left transition-all ${
                      isSelected
                        ? "border-primary bg-primary/10 ring-1 ring-primary"
                        : "border-border hover:border-muted-foreground/40 hover:bg-muted/50"
                    }`}
                  >
                    {variant.image ? (
                      <img
                        src={variant.image}
                        alt={variant.name}
                        className="h-8 w-8 shrink-0 rounded-md object-cover"
                      />
                    ) : (
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-muted">
                        <span className="text-[10px] font-semibold text-muted-foreground">
                          {variant.name.slice(0, 2).toUpperCase()}
                        </span>
                      </div>
                    )}
                    <div className="min-w-0">
                      <div className="truncate text-xs font-medium">
                        {variant.name}
                      </div>
                      <div className="text-[10px] text-muted-foreground">
                        {variant.price.toLocaleString("sr-RS")} RSD
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Pricing summary when a variant is selected and pricing rule applies */}
            {selectedVariantId !== null &&
              accessory.pricingRule !== "none" &&
              (() => {
                const variant = accessory.variants.find(
                  (v) => v.id === selectedVariantId,
                );
                if (!variant) return null;

                let qty = 0;
                let unitLabel = "";
                if (accessory.pricingRule === "perDrawer") {
                  qty = totalDrawers * accessory.qtyPerUnit;
                  unitLabel = `${totalDrawers} ${totalDrawers === 1 ? "fioka" : "fioka"} × ${accessory.qtyPerUnit}`;
                } else if (accessory.pricingRule === "perDoor") {
                  qty = totalDoorLeaves * accessory.qtyPerUnit;
                  unitLabel = `${totalDoorLeaves} ${totalDoorLeaves === 1 ? "vrata" : "vrata"} × ${accessory.qtyPerUnit}`;
                } else if (accessory.pricingRule === "fixed") {
                  qty = accessory.qtyPerUnit;
                  unitLabel = `fiksno`;
                }

                if (qty <= 0) return null;
                const total = qty * variant.price;

                return (
                  <div className="rounded-md bg-muted/50 px-3 py-2 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">
                        {unitLabel} = {qty} kom ×{" "}
                        {variant.price.toLocaleString("sr-RS")} RSD
                      </span>
                      <span className="font-semibold">
                        {total.toLocaleString("sr-RS")} RSD
                      </span>
                    </div>
                  </div>
                );
              })()}
          </div>
        );
      })}
    </div>
  );
}
