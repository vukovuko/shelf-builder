"use client";

import { Loader2, Upload, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { adminFetch } from "@/components/admin/admin-fetch";
import {
  DeleteAction,
  FormCard,
  PageHeader,
  SaveBar,
  StatusSelect,
} from "@/components/admin/page-chrome";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import MultipleSelector, { type Option } from "@/components/ui/multi-select";
import { Textarea } from "@/components/ui/textarea";
import { AVAILABLE_MATERIAL_CATEGORIES } from "@/lib/material-categories";

const FORM_ID = "material-form";

const AVAILABLE_CATEGORIES: Option[] = AVAILABLE_MATERIAL_CATEGORIES.map(
  (category) => ({ value: category, label: category }),
);

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
  description: string | null;
  popularRank: number | null;
  marginPercent: number | null;
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
  const [description, setDescription] = useState(
    initialMaterial.description ?? "",
  );
  const [popularRank, setPopularRank] = useState(
    initialMaterial.popularRank ? String(initialMaterial.popularRank) : "",
  );
  const [marginPercent, setMarginPercent] = useState(
    initialMaterial.marginPercent === null
      ? ""
      : String(initialMaterial.marginPercent),
  );
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Upload file to R2
  const uploadFile = async (file: File) => {
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);

      const res = await adminFetch("/api/admin/materials/upload", {
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
    if (file?.type.startsWith("image/")) {
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
    if ((description.trim() || null) !== material.description) return true;
    if (
      (popularRank === "" ? null : Number(popularRank)) !== material.popularRank
    )
      return true;
    if (
      (marginPercent === "" ? null : Number(marginPercent)) !==
      material.marginPercent
    )
      return true;

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
    description,
    popularRank,
    marginPercent,
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
      description: description.trim() || null,
      popularRank: popularRank ? Number(popularRank) : null,
      marginPercent: marginPercent === "" ? null : Number(marginPercent),
    };

    try {
      const res = await adminFetch(`/api/admin/materials/${material.id}`, {
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
      setDescription(updated.description ?? "");
      setPopularRank(updated.popularRank ? String(updated.popularRank) : "");
      setMarginPercent(
        updated.marginPercent === null ? "" : String(updated.marginPercent),
      );
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
      const res = await adminFetch(`/api/admin/materials/${material.id}`, {
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
    <div className="space-y-5">
      <SaveBar form={FORM_ID} dirty={hasChanges} saving={saving} />

      <PageHeader backHref="/admin/materials" title={material.name}>
        <StatusSelect on={published} onChange={setPublished} />
      </PageHeader>

      {error && (
        <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
      )}

      <form
        id={FORM_ID}
        onSubmit={handleSubmit}
        className="grid items-start gap-5 lg:grid-cols-3"
      >
        <div className="grid gap-5 lg:col-span-2">
          <FormCard>
            <div className="grid gap-4 sm:grid-cols-2">
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
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">Opis na stranici materijala</Label>
              <Textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                maxLength={3000}
                rows={6}
              />
            </div>
          </FormCard>

          <FormCard title="Slika">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
              {img && (
                <div className="relative size-32 shrink-0">
                  <img
                    src={img}
                    alt={name}
                    className="size-full rounded border object-cover"
                  />
                  <button
                    type="button"
                    aria-label="Ukloni sliku"
                    onClick={() => setImg("")}
                    className="absolute -top-2 -right-2 rounded-full bg-destructive p-1 text-destructive-foreground hover:bg-destructive/90"
                  >
                    <X className="size-3" />
                  </button>
                </div>
              )}
              <button
                type="button"
                onDragOver={handleDragOver}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className={`flex-1 cursor-pointer rounded-lg border-2 border-dashed p-6 text-center transition-colors ${
                  uploading
                    ? "border-muted bg-muted/50"
                    : "border-muted-foreground/25 hover:border-primary hover:bg-muted/50"
                }`}
              >
                {uploading ? (
                  <Loader2 className="mx-auto size-8 animate-spin text-muted-foreground" />
                ) : (
                  <>
                    <Upload className="mx-auto mb-2 size-8 text-muted-foreground" />
                    <span className="block text-sm text-muted-foreground">
                      Prevuci sliku ili klikni za upload
                    </span>
                    <span className="mt-1 block text-xs text-muted-foreground">
                      JPG, PNG ili WebP (max 5MB)
                    </span>
                  </>
                )}
              </button>
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileSelect}
                hidden
                accept="image/jpeg,image/png,image/webp"
              />
            </div>
          </FormCard>

          <FormCard title="Cena">
            <div className="grid gap-4 sm:grid-cols-3">
              <div className="space-y-2">
                <Label htmlFor="price">Prodajna (RSD/m²) *</Label>
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
                <Label htmlFor="costPrice">Nabavna (RSD/m²)</Label>
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
                <Label htmlFor="marginPercent">Marža (%)</Label>
                <Input
                  id="marginPercent"
                  type="number"
                  min={0}
                  max={300}
                  step={1}
                  value={marginPercent}
                  onChange={(e) => setMarginPercent(e.target.value)}
                  placeholder="globalna"
                />
              </div>
            </div>
          </FormCard>
        </div>

        <div className="grid gap-5">
          <FormCard title="Kategorije *">
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
          </FormCard>

          <FormCard title="Ploča">
            <div className="grid grid-cols-2 gap-4">
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
            </div>
          </FormCard>

          <FormCard>
            <div className="space-y-2">
              <Label htmlFor="popularRank">Popularno (redosled)</Label>
              <Input
                id="popularRank"
                type="number"
                min={1}
                max={999}
                value={popularRank}
                onChange={(e) => setPopularRank(e.target.value)}
                placeholder="npr. 1"
              />
            </div>
          </FormCard>
        </div>
      </form>

      <div className="border-t pt-5">
        <DeleteAction
          label="Obriši materijal"
          title="Obrisati materijal?"
          description={`Ova akcija je nepovratna. Materijal "${material.name}" će biti trajno obrisan.`}
          deleting={deleting}
          onConfirm={handleDelete}
        />
      </div>
    </div>
  );
}
