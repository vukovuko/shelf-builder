"use client";

import { useMemo } from "react";
import { useShelfStore, type ShelfState } from "@/lib/store";
import { Ban } from "lucide-react";

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
  const doorGroups = useShelfStore((s: ShelfState) => s.doorGroups);

  // Count total drawers across all compartments
  const totalDrawers = useMemo(() => {
    let count = 0;
    for (const extras of Object.values(compartmentExtras)) {
      if (extras.drawers && extras.drawersCount) {
        count += extras.drawersCount;
      }
    }
    return count;
  }, [compartmentExtras]);

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

  if (accessories.length === 0) {
    return (
      <div className="py-8 text-center">
        <p className="text-sm text-muted-foreground">Nema dostupnih dodataka</p>
      </div>
    );
  }

  return (
    <div className="space-y-5 pt-3">
      {accessories.map((accessory) => {
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
            </div>

            {/* Variant selection grid */}
            <div className="grid grid-cols-2 gap-2">
              {/* "None" option */}
              <button
                type="button"
                onClick={() => setSelectedAccessory(accessory.id, null)}
                className={`flex items-center gap-2 rounded-lg border p-2.5 text-left transition-all ${
                  selectedVariantId === null
                    ? "border-primary bg-primary/10 ring-1 ring-primary"
                    : "border-border hover:border-muted-foreground/40 hover:bg-muted/50"
                }`}
              >
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-muted">
                  <Ban className="h-4 w-4 text-muted-foreground" />
                </div>
                <span className="text-xs font-medium">Bez dodatka</span>
              </button>

              {/* Variant options */}
              {accessory.variants.map((variant) => {
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
