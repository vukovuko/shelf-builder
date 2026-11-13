"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { adminFetch } from "@/components/admin/admin-fetch";
import {
  PageHeader,
  SaveBar,
  StatusSelect,
} from "@/components/admin/page-chrome";
import { Card } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AVAILABLE_MATERIAL_CATEGORIES } from "@/lib/material-categories";

const FORM_ID = "new-material-form";

export function MaterialNewClient() {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  // Typing in any field. The pickers below have their own state.
  const [touched, setTouched] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [categories, setCategories] = useState<string[]>([]);
  const [published, setPublished] = useState(false);

  const toggleCategory = (cat: string) => {
    setCategories((prev) =>
      prev.includes(cat) ? prev.filter((c) => c !== cat) : [...prev, cat],
    );
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setSaving(true);
    setError(null);

    if (categories.length === 0) {
      setError("Izaberi barem jednu kategoriju");
      setSaving(false);
      return;
    }

    const formData = new FormData(e.currentTarget);
    const data = {
      name: formData.get("name") as string,
      productCode: (formData.get("productCode") as string) || undefined,
      price: Number(formData.get("price")),
      costPrice: formData.get("costPrice")
        ? Number(formData.get("costPrice"))
        : 0,
      categories,
      published,
      img: (formData.get("img") as string) || undefined,
      thickness: formData.get("thickness")
        ? Number(formData.get("thickness"))
        : undefined,
      stock: formData.get("stock") ? Number(formData.get("stock")) : undefined,
    };

    try {
      const res = await adminFetch("/api/admin/materials", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      if (!res.ok) {
        const json = await res.json();
        throw new Error(json.error || "Greska pri cuvanju");
      }

      toast.success("Materijal dodat");
      router.push("/admin/materials");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Greska pri cuvanju");
      toast.error(err instanceof Error ? err.message : "Greska pri cuvanju");
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <SaveBar
        form={FORM_ID}
        dirty={touched || published || categories.length > 0}
        saving={saving}
      />

      <PageHeader backHref="/admin/materials" title="Novi materijal">
        <StatusSelect on={published} onChange={setPublished} />
      </PageHeader>

      <Card className="p-6">
        <form
          id={FORM_ID}
          onSubmit={handleSubmit}
          onInput={() => setTouched(true)}
          className="space-y-4"
        >
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="name">Naziv *</Label>
              <Input
                id="name"
                name="name"
                required
                placeholder="npr. Sperploca bukva"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="productCode">Šifra</Label>
              <Input
                id="productCode"
                name="productCode"
                placeholder="npr. LLESOBHDF"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="price">Prodajna cena (RSD/m²) *</Label>
              <Input
                id="price"
                name="price"
                type="number"
                min={1}
                required
                placeholder="npr. 2500"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="costPrice">Nabavna cena (RSD/m²)</Label>
              <Input
                id="costPrice"
                name="costPrice"
                type="number"
                min={0}
                placeholder="npr. 1800"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="thickness">Debljina (mm)</Label>
              <Input
                id="thickness"
                name="thickness"
                type="number"
                min={1}
                placeholder="npr. 18"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="stock">Zaliha</Label>
              <Input
                id="stock"
                name="stock"
                type="number"
                min={0}
                placeholder="npr. 50"
              />
            </div>

            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="img">URL slike</Label>
              <Input id="img" name="img" placeholder="npr. /img/slika1.jpg" />
            </div>
          </div>

          <div className="space-y-3 pt-2">
            <Label>Kategorije *</Label>
            <div className="space-y-2">
              {AVAILABLE_MATERIAL_CATEGORIES.map((cat) => (
                <div key={cat} className="flex items-center space-x-2">
                  <Checkbox
                    id={cat}
                    checked={categories.includes(cat)}
                    onCheckedChange={() => toggleCategory(cat)}
                  />
                  <label
                    htmlFor={cat}
                    className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                  >
                    {cat}
                  </label>
                </div>
              ))}
            </div>
          </div>

          {error && (
            <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
          )}
        </form>
      </Card>
    </div>
  );
}
