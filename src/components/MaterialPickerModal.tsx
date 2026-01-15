"use client";

import { useState, useMemo } from "react";
import {
  Dialog,
  DialogContent,
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

type SortOption = "name" | "price-asc" | "price-desc";

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
  const [sort, setSort] = useState<SortOption>("name");
  const [thicknessFilter, setThicknessFilter] = useState<number | null>(null);

  // Get unique thicknesses for filter
  const availableThicknesses = useMemo(() => {
    const set = new Set(
      materials.map((m) => m.thickness).filter((t): t is number => t !== null),
    );
    return Array.from(set).sort((a, b) => a - b);
  }, [materials]);

  const filtered = useMemo(() => {
    let result = materials;

    // Search filter
    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter((m) => m.name.toLowerCase().includes(q));
    }

    // Thickness filter
    if (thicknessFilter !== null) {
      result = result.filter((m) => m.thickness === thicknessFilter);
    }

    // Sorting
    result = [...result].sort((a, b) => {
      if (sort === "price-asc") return a.price - b.price;
      if (sort === "price-desc") return b.price - a.price;
      return a.name.localeCompare(b.name);
    });

    return result;
  }, [materials, search, sort, thicknessFilter]);

  const clearFilters = () => {
    setSearch("");
    setSort("name");
    setThicknessFilter(null);
  };

  const hasFilters = search || sort !== "name" || thicknessFilter !== null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[95vw] max-w-6xl h-[90vh] max-h-[900px] flex flex-col p-0">
        <DialogHeader className="px-6 pt-6 pb-4 border-b">
          <DialogTitle className="text-xl">{category}</DialogTitle>
        </DialogHeader>

        {/* Search + Filters */}
        <div className="px-6 py-4 space-y-3 border-b bg-muted/30">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Pretraži materijale..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 h-10"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Sort */}
            <Select
              value={sort}
              onValueChange={(v) => setSort(v as SortOption)}
            >
              <SelectTrigger className="w-[140px] h-9">
                <SelectValue placeholder="Sortiraj" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="name">Po imenu</SelectItem>
                <SelectItem value="price-asc">Cena ↑</SelectItem>
                <SelectItem value="price-desc">Cena ↓</SelectItem>
              </SelectContent>
            </Select>

            {/* Thickness filter */}
            {availableThicknesses.length > 1 && (
              <Select
                value={thicknessFilter?.toString() ?? "all"}
                onValueChange={(v) =>
                  setThicknessFilter(v === "all" ? null : Number(v))
                }
              >
                <SelectTrigger className="w-[120px] h-9">
                  <SelectValue placeholder="Debljina" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Sve</SelectItem>
                  {availableThicknesses.map((t) => (
                    <SelectItem key={t} value={t.toString()}>
                      {t}mm
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}

            {/* Clear filters */}
            {hasFilters && (
              <Button variant="ghost" size="sm" onClick={clearFilters}>
                <X className="h-4 w-4 mr-1" /> Očisti
              </Button>
            )}

            <span className="text-sm text-muted-foreground ml-auto">
              {filtered.length} materijala
            </span>
          </div>
        </div>

        {/* Grid */}
        <div className="flex-1 overflow-y-auto p-6">
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
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
