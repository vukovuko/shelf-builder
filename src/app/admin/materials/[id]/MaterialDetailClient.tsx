"use client";

import { useState, useMemo, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import { ArrowLeft, Trash2, Upload, X, Loader2 } from "lucide-react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import MultipleSelector, { type Option } from "@/components/ui/multi-select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

const AVAILABLE_CATEGORIES: Option[] = [
  { value: "Materijal za Korpus (18mm)", label: "Materijal za Korpus (18mm)" },
  {
    value: "Materijal za Lica/Vrata (18mm)",
    label: "Materijal za Lica/Vrata (18mm)",
  },
  { value: "Materijal za Leđa (3mm)", label: "Materijal za Leđa (3mm)" },
];

interface Material {
  id: number;
  name: string;
  productCode: string | null;
  price: number;
  costPrice: number;
  img: string | null;
  thickness: number | null;
  stock: number | null;
  categories: string[];
  published: boolean;
  createdAt: string;
  updatedAt: string;
}

interface MaterialDetailClientProps {
  material: Material;
}

export function MaterialDetailClient({
  material: initialMaterial,
}: MaterialDetailClientProps) {
  const router = useRouter();
  const [material, setMaterial] = useState(initialMaterial);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Controlled form state
  const [name, setName] = useState(initialMaterial.name);
  const [productCode, setProductCode] = useState(
    initialMaterial.productCode ?? "",
  );
  const [price, setPrice] = useState(String(initialMaterial.price));
  const [costPrice, setCostPrice] = useState(
    String(initialMaterial.costPrice ?? 0),
  );
  const [thickness, setThickness] = useState(
    initialMaterial.thickness ? String(initialMaterial.thickness) : "",
  );
  const [stock, setStock] = useState(
    initialMaterial.stock ? String(initialMaterial.stock) : "",
  );
  const [img, setImg] = useState(initialMaterial.img ?? "");
  const [categories, setCategories] = useState<Option[]>(
    initialMaterial.categories.map((c) => ({ value: c, label: c })),
  );
  const [published, setPublished] = useState(initialMaterial.published);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Upload file to R2
  const uploadFile = async (file: File) => {
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);

      const res = await fetch("/api/admin/materials/upload", {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        const json = await res.json();
        throw new Error(json.error || "Upload failed");
      }

      const { url } = await res.json();
      setImg(url);
      toast.success("Slika uploadovana");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setUploading(false);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      uploadFile(file);
    }
    // Reset input so same file can be selected again
    e.target.value = "";
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const file = e.dataTransfer.files?.[0];
    if (file && file.type.startsWith("image/")) {
      uploadFile(file);
    }
  };

  // Track if anything changed
  const hasChanges = useMemo(() => {
    if (name !== material.name) return true;
    if ((productCode || null) !== material.productCode) return true;
    if (Number(price) !== material.price) return true;
    if (Number(costPrice) !== (material.costPrice ?? 0)) return true;
    if ((thickness === "" ? null : Number(thickness)) !== material.thickness)
      return true;
    if ((stock === "" ? null : Number(stock)) !== material.stock) return true;
    if ((img || null) !== material.img) return true;
    if (published !== material.published) return true;

    const currentCategories = categories.map((c) => c.value).sort();
    const materialCategories = [...material.categories].sort();
    if (currentCategories.length !== materialCategories.length) return true;
    if (currentCategories.some((c, i) => c !== materialCategories[i]))
      return true;

    return false;
  }, [
    name,
    productCode,
    price,
    costPrice,
    thickness,
    stock,
    img,
    published,
    categories,
    material,
  ]);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setSaving(true);
    setError(null);

    if (categories.length === 0) {
      setError("Izaberi barem jednu kategoriju");
      setSaving(false);
      return;
    }

    const data = {
      name,
      productCode: productCode || null,
      price: Number(price),
      costPrice: Number(costPrice) || 0,
      categories: categories.map((c) => c.value),
      published,
      img: img || null,
      thickness: thickness ? Number(thickness) : null,
      stock: stock ? Number(stock) : null,
    };

    try {
      const res = await fetch(`/api/admin/materials/${material.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      if (!res.ok) {
        const json = await res.json();
        throw new Error(json.error || "Greska pri cuvanju");
      }

      const updated = await res.json();
      setMaterial({
        ...updated,
        createdAt: updated.createdAt,
        updatedAt: updated.updatedAt,
      });
      // Sync form state with saved values
      setName(updated.name);
      setProductCode(updated.productCode ?? "");
      setPrice(String(updated.price));
      setCostPrice(String(updated.costPrice ?? 0));
      setThickness(updated.thickness ? String(updated.thickness) : "");
      setStock(updated.stock ? String(updated.stock) : "");
      setImg(updated.img ?? "");
      setPublished(updated.published);
      setCategories(
        updated.categories.map((c: string) => ({ value: c, label: c })),
      );
      toast.success("Materijal sacuvan");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Greska pri cuvanju");
      toast.error(err instanceof Error ? err.message : "Greska pri cuvanju");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    setDeleting(true);
    try {
      const res = await fetch(`/api/admin/materials/${material.id}`, {
        method: "DELETE",
      });

      if (!res.ok) {
        const json = await res.json();
        throw new Error(json.error || "Greska pri brisanju");
      }

      toast.success("Materijal obrisan");
      router.push("/admin/materials");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Greska pri brisanju");
      setDeleting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-4 min-w-0">
          <Button variant="ghost" size="icon" asChild className="shrink-0">
            <Link href="/admin/materials">
              <ArrowLeft className="h-5 w-5" />
            </Link>
          </Button>
          <div className="min-w-0">
            <Popover>
              <PopoverTrigger asChild>
                <h1 className="text-2xl sm:text-3xl font-semibold truncate cursor-pointer">
                  {material.name}
                </h1>
              </PopoverTrigger>
              <PopoverContent
                side="bottom"
                className="w-auto max-w-xs p-2 text-sm"
              >
                {material.name}
              </PopoverContent>
            </Popover>
            <div
              className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium mt-1 ${
                material.published
                  ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200"
                  : "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200"
              }`}
            >
              {material.published ? "Objavljeno" : "Draft"}
            </div>
          </div>
        </div>

        {/* Mobile delete button - icon only */}
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button
              variant="destructive"
              size="icon"
              disabled={deleting}
              className="sm:hidden h-8 w-8 shrink-0"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Obrisati materijal?</AlertDialogTitle>
              <AlertDialogDescription>
                Ova akcija je nepovratna. Materijal &quot;{material.name}&quot;
                ce biti trajno obrisan.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={deleting}>Otkazi</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleDelete}
                disabled={deleting}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                {deleting ? "Brisanje..." : "Obrisi"}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* Desktop delete button - with text */}
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button
              variant="destructive"
              disabled={deleting}
              className="hidden sm:flex shrink-0"
            >
              <Trash2 className="h-4 w-4 mr-2" />
              {deleting ? "Brisanje..." : "Obrisi"}
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Obrisati materijal?</AlertDialogTitle>
              <AlertDialogDescription>
                Ova akcija je nepovratna. Materijal &quot;{material.name}&quot;
                ce biti trajno obrisan.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={deleting}>Otkazi</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleDelete}
                disabled={deleting}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                {deleting ? "Brisanje..." : "Obrisi"}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>

      <Card className="p-6">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="name">Naziv *</Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                placeholder="npr. Sperploca bukva"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="productCode">Šifra</Label>
              <Input
                id="productCode"
                value={productCode}
                onChange={(e) => setProductCode(e.target.value)}
                placeholder="npr. LLESOBHDF"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="price">Prodajna cena (RSD/m²) *</Label>
              <Input
                id="price"
                type="number"
                min={1}
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                required
                placeholder="npr. 2500"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="costPrice">Nabavna cena (RSD/m²)</Label>
              <Input
                id="costPrice"
                type="number"
                min={0}
                value={costPrice}
                onChange={(e) => setCostPrice(e.target.value)}
                placeholder="npr. 1800"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="thickness">Debljina (mm)</Label>
              <Input
                id="thickness"
                type="number"
                min={1}
                value={thickness}
                onChange={(e) => setThickness(e.target.value)}
                placeholder="npr. 18"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="stock">Zaliha</Label>
              <Input
                id="stock"
                type="number"
                min={0}
                value={stock}
                onChange={(e) => setStock(e.target.value)}
                placeholder="npr. 50"
              />
            </div>

            <div className="space-y-2 md:col-span-2">
              <Label>Slika materijala</Label>

              {/* Current image preview */}
              {img && (
                <div className="relative w-32 h-32 mb-2">
                  <img
                    src={img}
                    alt="Preview"
                    className="w-full h-full object-cover rounded border"
                  />
                  <button
                    type="button"
                    onClick={() => setImg("")}
                    className="absolute -top-2 -right-2 bg-destructive text-destructive-foreground rounded-full p-1 hover:bg-destructive/90"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
              )}

              {/* Drag-and-drop zone */}
              <div
                onDragOver={handleDragOver}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className={`border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors ${
                  uploading
                    ? "border-muted bg-muted/50"
                    : "border-muted-foreground/25 hover:border-primary hover:bg-muted/50"
                }`}
              >
                {uploading ? (
                  <Loader2 className="h-8 w-8 animate-spin mx-auto text-muted-foreground" />
                ) : (
                  <>
                    <Upload className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
                    <p className="text-sm text-muted-foreground">
                      Prevuci sliku ili klikni za upload
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      JPG, PNG ili WebP (max 5MB)
                    </p>
                  </>
                )}
              </div>
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileSelect}
                hidden
                accept="image/jpeg,image/png,image/webp"
              />
            </div>
          </div>

          <div className="space-y-3 pt-2">
            <Label>Kategorije *</Label>
            <MultipleSelector
              value={categories}
              onChange={setCategories}
              defaultOptions={AVAILABLE_CATEGORIES}
              placeholder="Izaberi ili dodaj kategorije..."
              emptyIndicator={
                <p className="text-center text-sm text-muted-foreground">
                  Nema rezultata
                </p>
              }
              hidePlaceholderWhenSelected
              creatable
            />
          </div>

          <div className="flex items-center space-x-2 pt-2">
            <Switch
              id="published"
              checked={published}
              onCheckedChange={setPublished}
            />
            <Label htmlFor="published">
              Objavljeno (vidljivo korisnicima na /design)
            </Label>
          </div>

          {error && (
            <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
          )}

          <div className="flex justify-end pt-4">
            <Button type="submit" disabled={saving || !hasChanges}>
              {saving ? "Cuvanje..." : "Sacuvaj izmene"}
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
}
