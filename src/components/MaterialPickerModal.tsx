"use client";

import { useState, useMemo } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Search, X } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Material } from "@/lib/store";

type PriceSort = "none" | "asc" | "desc";

interface MaterialPickerModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  category: string;
  materials: Material[];
  selectedId: number | undefined;
  onSelect: (materialId: number) => void;
}

export function MaterialPickerModal({
  open,
  onOpenChange,
  category,
  materials,
  selectedId,
  onSelect,
}: MaterialPickerModalProps) {
  const [search, setSearch] = useState("");
  const [priceSort, setPriceSort] = useState<PriceSort>("none");
  const [thicknessFilter, setThicknessFilter] = useState<string>("all");

  const filtered = useMemo(() => {
    let result = materials;

    // Search filter by name
    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter((m) => m.name.toLowerCase().includes(q));
    }

    // Thickness filter
    if (thicknessFilter !== "all") {
      const thickness = Number(thicknessFilter);
      result = result.filter((m) => m.thickness === thickness);
    }

    // Sorting - by name first, then by price if selected
    result = [...result].sort((a, b) => {
      if (priceSort === "asc") return a.price - b.price;
      if (priceSort === "desc") return b.price - a.price;
      return a.name.localeCompare(b.name);
    });

    return result;
  }, [materials, search, priceSort, thicknessFilter]);

  const clearFilters = () => {
    setSearch("");
    setPriceSort("none");
    setThicknessFilter("all");
  };

  const hasFilters =
    search || priceSort !== "none" || thicknessFilter !== "all";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[95vw] max-w-[calc(100%-2rem)] sm:max-w-[1400px] h-[90vh] max-h-[900px] flex flex-col p-0">
        <DialogHeader className="px-6 pt-6 pb-4 border-b">
          <DialogTitle className="text-xl">{category}</DialogTitle>
          <DialogDescription className="sr-only">
            Izaberite materijal iz liste
          </DialogDescription>
        </DialogHeader>

        {/* Search + Filters */}
        <div className="px-6 py-4 space-y-4 border-b bg-muted/30">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Pretraži po nazivu..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 h-10"
            />
          </div>

          <div className="flex flex-wrap items-center gap-4">
            {/* Price Sort */}
            <div className="flex flex-col gap-1">
              <span className="text-xs text-muted-foreground">Cena</span>
              <Select
                value={priceSort}
                onValueChange={(v) => setPriceSort(v as PriceSort)}
              >
                <SelectTrigger className="w-[160px] h-9">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Sve cene</SelectItem>
                  <SelectItem value="asc">Jeftinije prvo</SelectItem>
                  <SelectItem value="desc">Skuplje prvo</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Thickness filter */}
            <div className="flex flex-col gap-1">
              <span className="text-xs text-muted-foreground">Debljina</span>
              <Select
                value={thicknessFilter}
                onValueChange={setThicknessFilter}
              >
                <SelectTrigger className="w-[120px] h-9">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Sve</SelectItem>
                  <SelectItem value="18">18mm</SelectItem>
                  <SelectItem value="19">19mm</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Clear filters */}
            {hasFilters && (
              <Button
                variant="ghost"
                size="sm"
                onClick={clearFilters}
                className="mt-auto"
              >
                <X className="h-4 w-4 mr-1" /> Očisti filtere
              </Button>
            )}

            <span className="text-sm text-muted-foreground ml-auto mt-auto">
              {filtered.length} materijala
            </span>
          </div>
        </div>

        {/* Grid */}
        <div className="flex-1 overflow-y-auto p-6">
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-7 gap-4">
            {filtered.map((material) => (
              <button
                key={material.id}
                type="button"
                onClick={() => {
                  onSelect(material.id);
                  onOpenChange(false);
                }}
                className={cn(
                  "flex flex-col rounded-lg border-2 overflow-hidden transition-all bg-card text-left hover:shadow-md",
                  selectedId === material.id
                    ? "border-primary ring-2 ring-primary/20"
                    : "border-border hover:border-primary/50",
                )}
              >
                <div
                  className="aspect-square bg-cover bg-center bg-muted"
                  style={{
                    backgroundImage: material.img
                      ? `url(${material.img})`
                      : undefined,
                  }}
                />
                <div className="p-3 space-y-1">
                  <p
                    className="text-sm font-medium line-clamp-2 leading-tight"
                    title={material.name}
                  >
                    {material.name}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {material.price.toLocaleString("sr-RS")} RSD/m²
                  </p>
                  {material.thickness && (
                    <span className="inline-block text-xs bg-muted px-2 py-0.5 rounded">
                      {material.thickness}mm
                    </span>
                  )}
                </div>
              </button>
            ))}
          </div>

          {filtered.length === 0 && (
            <div className="text-center py-16 text-muted-foreground">
              Nema rezultata
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
