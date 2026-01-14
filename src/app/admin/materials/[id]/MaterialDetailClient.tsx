"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import { ArrowLeft, Trash2 } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import { CategoryCombobox } from "@/components/CategoryCombobox";

interface Material {
  id: number;
  name: string;
  price: number;
  img: string | null;
  thickness: number | null;
  stock: number | null;
  category: string;
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
  const [category, setCategory] = useState(initialMaterial.category);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setSaving(true);
    setError(null);

    if (!category.trim()) {
      setError("Kategorija je obavezna");
      setSaving(false);
      return;
    }

    const formData = new FormData(e.currentTarget);
    const data = {
      name: formData.get("name") as string,
      price: Number(formData.get("price")),
      category: category.trim(),
      img: (formData.get("img") as string) || null,
      thickness: formData.get("thickness")
        ? Number(formData.get("thickness"))
        : null,
      stock: formData.get("stock") ? Number(formData.get("stock")) : null,
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
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" asChild>
            <Link href="/admin/materials">
              <ArrowLeft className="h-5 w-5" />
            </Link>
          </Button>
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold truncate">
              {material.name}
            </h1>
          </div>
        </div>

        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button
              variant="destructive"
              disabled={deleting}
              className="w-full sm:w-auto"
            >
              <Trash2 className="mr-2 h-4 w-4" />
              {deleting ? "Brisanje..." : "Obriši"}
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Obrisi materijal</AlertDialogTitle>
              <AlertDialogDescription>
                Da li si siguran da zelis da obrises materijal "{material.name}
                "? Ova akcija se ne moze ponistiti.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={deleting}>
                Odustani
              </AlertDialogCancel>
              <AlertDialogAction
                onClick={handleDelete}
                disabled={deleting}
                className="bg-red-600 hover:bg-red-700"
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
                name="name"
                defaultValue={material.name}
                required
                placeholder="npr. Sperploca bukva"
              />
            </div>

            <div className="space-y-2">
              <Label>Kategorija *</Label>
              <CategoryCombobox
                value={category}
                onChange={setCategory}
                placeholder="Izaberi ili unesi kategoriju..."
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="price">Cena (RSD/m2) *</Label>
              <Input
                id="price"
                name="price"
                type="number"
                min={1}
                defaultValue={material.price}
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
                defaultValue={material.thickness ?? ""}
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
                defaultValue={material.stock ?? ""}
                placeholder="npr. 50"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="img">URL slike</Label>
              <Input
                id="img"
                name="img"
                defaultValue={material.img ?? ""}
                placeholder="npr. /img/slika1.jpg"
              />
            </div>
          </div>

          {error && (
            <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
          )}

          <div className="flex justify-end pt-4">
            <Button type="submit" disabled={saving}>
              {saving ? "Cuvanje..." : "Sacuvaj izmene"}
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
}
