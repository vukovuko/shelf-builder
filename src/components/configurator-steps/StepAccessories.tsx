"use client";

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
          </div>
        );
      })}
    </div>
  );
}
