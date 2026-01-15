"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import { ArrowLeft } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch";

const AVAILABLE_CATEGORIES = [
  "Materijal za Korpus (18mm)",
  "Materijal za Lica/Vrata (18mm)",
  "Materijal za Leđa (3mm)",
];

export function MaterialNewClient() {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
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
      price: Number(formData.get("price")),
      categories,
      published,
      img: (formData.get("img") as string) || undefined,
      thickness: formData.get("thickness")
        ? Number(formData.get("thickness"))
        : undefined,
      stock: formData.get("stock") ? Number(formData.get("stock")) : undefined,
    };

    try {
      const res = await fetch("/api/admin/materials", {
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
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/admin/materials">
            <ArrowLeft className="h-5 w-5" />
          </Link>
        </Button>
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold">Novi materijal</h1>
          <p className="text-sm sm:text-base text-muted-foreground">
            Dodaj novi materijal
          </p>
        </div>
      </div>

      <Card className="p-6">
        <form onSubmit={handleSubmit} className="space-y-4">
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
              <Label htmlFor="price">Cena (RSD/m2) *</Label>
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
              {AVAILABLE_CATEGORIES.map((cat) => (
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

          <div className="flex justify-end gap-2 pt-4">
            <Button type="button" variant="outline" asChild>
              <Link href="/admin/materials">Odustani</Link>
            </Button>
            <Button type="submit" disabled={saving}>
              {saving ? "Cuvanje..." : "Dodaj materijal"}
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
}
