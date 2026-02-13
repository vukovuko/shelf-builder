"use client";

import { useState, useMemo, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import { ArrowLeft, Trash2, Pencil, Upload, X, Loader2 } from "lucide-react";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface AccessoryVariant {
  id: number;
  accessoryId: number;
  name: string;
  image: string | null;
  price: number;
  costPrice: number;
  createdAt: string;
  updatedAt: string;
}

type PricingRule = "none" | "perDrawer" | "perDoor" | "fixed";

interface Accessory {
  id: number;
  name: string;
  description: string | null;
  mainImage: string | null;
  published: boolean;
  pricingRule: PricingRule;
  qtyPerUnit: number;
  createdAt: string;
  updatedAt: string;
  variants: AccessoryVariant[];
}

interface AccessoryDetailClientProps {
  accessory: Accessory;
}

export function AccessoryDetailClient({
  accessory: initialAccessory,
}: AccessoryDetailClientProps) {
  const router = useRouter();
  const [accessory, setAccessory] = useState(initialAccessory);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Accessory form state
  const [name, setName] = useState(initialAccessory.name);
  const [description, setDescription] = useState(
    initialAccessory.description ?? "",
  );
  const [mainImage, setMainImage] = useState(initialAccessory.mainImage ?? "");
  const [published, setPublished] = useState(initialAccessory.published);
  const [pricingRule, setPricingRule] = useState<PricingRule>(
    initialAccessory.pricingRule ?? "none",
  );
  const [qtyPerUnit, setQtyPerUnit] = useState(
    String(initialAccessory.qtyPerUnit ?? 1),
  );

  // Variant dialog state
  const [variantDialogOpen, setVariantDialogOpen] = useState(false);
  const [editingVariant, setEditingVariant] = useState<AccessoryVariant | null>(
    null,
  );
  const [variantName, setVariantName] = useState("");
  const [variantImage, setVariantImage] = useState("");
  const [variantPrice, setVariantPrice] = useState("");
  const [savingVariant, setSavingVariant] = useState(false);
  const [deletingVariantId, setDeletingVariantId] = useState<number | null>(
    null,
  );

  // Upload state
  const [uploadingMain, setUploadingMain] = useState(false);
  const [uploadingVariantImg, setUploadingVariantImg] = useState(false);
  const mainFileRef = useRef<HTMLInputElement>(null);
  const variantFileRef = useRef<HTMLInputElement>(null);

  const uploadFile = async (
    file: File,
    setUrl: (url: string) => void,
    setLoading: (v: boolean) => void,
  ) => {
    setLoading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("folder", "accessories");
      const res = await fetch("/api/admin/upload", {
        method: "POST",
        body: formData,
      });
      if (!res.ok) {
        const json = await res.json();
        throw new Error(json.error || "Upload failed");
      }
      const { url } = await res.json();
      setUrl(url);
      toast.success("Slika uploadovana");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setLoading(false);
    }
  };

  const hasChanges = useMemo(() => {
    if (name !== accessory.name) return true;
    if ((description || null) !== accessory.description) return true;
    if ((mainImage || null) !== accessory.mainImage) return true;
    if (published !== accessory.published) return true;
    if (pricingRule !== (accessory.pricingRule ?? "none")) return true;
    if (Number(qtyPerUnit) !== (accessory.qtyPerUnit ?? 1)) return true;
    return false;
  }, [
    name,
    description,
    mainImage,
    published,
    pricingRule,
    qtyPerUnit,
    accessory,
  ]);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setSaving(true);
    setError(null);

    const data = {
      name,
      description: description || null,
      mainImage: mainImage || null,
      published,
      pricingRule,
      qtyPerUnit: Number(qtyPerUnit) || 1,
    };

    try {
      const res = await fetch(`/api/admin/accessories/${accessory.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      if (!res.ok) {
        const json = await res.json();
        throw new Error(json.error || "Greška pri čuvanju");
      }

      const updated = await res.json();
      setAccessory(updated);
      setName(updated.name);
      setDescription(updated.description ?? "");
      setMainImage(updated.mainImage ?? "");
      setPublished(updated.published);
      setPricingRule(updated.pricingRule ?? "none");
      setQtyPerUnit(String(updated.qtyPerUnit ?? 1));
      toast.success("Dodatak sačuvan");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Greška pri čuvanju");
      toast.error(err instanceof Error ? err.message : "Greška pri čuvanju");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    setDeleting(true);
    try {
      const res = await fetch(`/api/admin/accessories/${accessory.id}`, {
        method: "DELETE",
      });

      if (!res.ok) {
        const json = await res.json();
        throw new Error(json.error || "Greška pri brisanju");
      }

      toast.success("Dodatak obrisan");
      router.push("/admin/accessories");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Greška pri brisanju");
      setDeleting(false);
    }
  };

  const openAddVariant = () => {
    setEditingVariant(null);
    setVariantName("");
    setVariantImage("");
    setVariantPrice("");
    setVariantDialogOpen(true);
  };

  const openEditVariant = (variant: AccessoryVariant) => {
    setEditingVariant(variant);
    setVariantName(variant.name);
    setVariantImage(variant.image ?? "");
    setVariantPrice(String(variant.price));
    setVariantDialogOpen(true);
  };

  const handleVariantSubmit = async () => {
    setSavingVariant(true);
    try {
      const data = {
        name: variantName,
        image: variantImage || null,
        price: Number(variantPrice),
      };

      let res;
      if (editingVariant) {
        res = await fetch(
          `/api/admin/accessories/${accessory.id}/variants/${editingVariant.id}`,
          {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(data),
          },
        );
      } else {
        res = await fetch(`/api/admin/accessories/${accessory.id}/variants`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(data),
        });
      }

      if (!res.ok) {
        const json = await res.json();
        throw new Error(json.error || "Greška");
      }

      toast.success(
        editingVariant ? "Varijanta ažurirana" : "Varijanta dodana",
      );
      setVariantDialogOpen(false);

      // Re-fetch accessory to update local state (router.refresh only updates server component props)
      const freshRes = await fetch(`/api/admin/accessories/${accessory.id}`);
      if (freshRes.ok) {
        const fresh = await freshRes.json();
        setAccessory(fresh);
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Greška");
    } finally {
      setSavingVariant(false);
    }
  };

  const handleDeleteVariant = async (variantId: number) => {
    setDeletingVariantId(variantId);
    try {
      const res = await fetch(
        `/api/admin/accessories/${accessory.id}/variants/${variantId}`,
        {
          method: "DELETE",
        },
      );

      if (!res.ok) {
        const json = await res.json();
        throw new Error(json.error || "Greška pri brisanju");
      }

      toast.success("Varijanta obrisana");

      const freshRes = await fetch(`/api/admin/accessories/${accessory.id}`);
      if (freshRes.ok) {
        const fresh = await freshRes.json();
        setAccessory(fresh);
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Greška pri brisanju");
    } finally {
      setDeletingVariantId(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-4 min-w-0">
          <Button variant="ghost" size="icon" asChild className="shrink-0">
            <Link href="/admin/accessories">
              <ArrowLeft className="h-5 w-5" />
            </Link>
          </Button>
          <div className="min-w-0">
            <Popover>
              <PopoverTrigger asChild>
                <h1 className="text-2xl sm:text-3xl font-semibold truncate cursor-pointer">
                  {accessory.name}
                </h1>
              </PopoverTrigger>
              <PopoverContent
                side="bottom"
                className="w-auto max-w-xs p-2 text-sm"
              >
                {accessory.name}
              </PopoverContent>
            </Popover>
            <div
              className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium mt-1 ${
                accessory.published
                  ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200"
                  : "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200"
              }`}
            >
              {accessory.published ? "Objavljeno" : "Draft"}
            </div>
          </div>
        </div>

        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button
              variant="destructive"
              disabled={deleting}
              className="shrink-0"
            >
              <Trash2 className="h-4 w-4 sm:mr-2" />
              <span className="hidden sm:inline">
                {deleting ? "Brisanje..." : "Obriši"}
              </span>
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Obrisati dodatak?</AlertDialogTitle>
              <AlertDialogDescription>
                Ova akcija je nepovratna. Dodatak &quot;{accessory.name}&quot;
                će biti trajno obrisan zajedno sa svim varijantama.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={deleting}>Otkaži</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleDelete}
                disabled={deleting}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                {deleting ? "Brisanje..." : "Obriši"}
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
                placeholder="npr. Klizač"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Opis</Label>
              <Input
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="npr. Klizač za fioke"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="pricingRule">Pravilo obračuna</Label>
              <Select
                value={pricingRule}
                onValueChange={(v) => setPricingRule(v as PricingRule)}
              >
                <SelectTrigger id="pricingRule">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Bez obračuna</SelectItem>
                  <SelectItem value="perDrawer">Po fioci</SelectItem>
                  <SelectItem value="perDoor">Po vratima</SelectItem>
                  <SelectItem value="fixed">Fiksno</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="qtyPerUnit">Količina po jedinici</Label>
              <Input
                id="qtyPerUnit"
                type="number"
                min={1}
                value={qtyPerUnit}
                onChange={(e) => setQtyPerUnit(e.target.value)}
                placeholder="npr. 2"
              />
              <p className="text-xs text-muted-foreground">
                {pricingRule === "perDrawer" &&
                  "Koliko komada po fioci (npr. 2 klizača)"}
                {pricingRule === "perDoor" && "Koliko komada po vratima"}
                {pricingRule === "fixed" && "Ukupna količina za ceo ormar"}
                {pricingRule === "none" && "Nema obračuna cene"}
              </p>
            </div>

            <div className="space-y-2 md:col-span-2">
              <Label>Glavna slika</Label>

              {mainImage && (
                <div className="relative w-32 h-32 mb-2">
                  <img
                    src={mainImage}
                    alt="Preview"
                    className="w-full h-full object-cover rounded border"
                  />
                  <button
                    type="button"
                    onClick={() => setMainImage("")}
                    className="absolute -top-2 -right-2 bg-destructive text-destructive-foreground rounded-full p-1 hover:bg-destructive/90"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
              )}

              <div
                onDragOver={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                }}
                onDrop={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  const file = e.dataTransfer.files?.[0];
                  if (file?.type.startsWith("image/"))
                    uploadFile(file, setMainImage, setUploadingMain);
                }}
                onClick={() => mainFileRef.current?.click()}
                className={`border-2 border-dashed rounded-lg p-4 text-center cursor-pointer transition-colors ${
                  uploadingMain
                    ? "border-muted bg-muted/50"
                    : "border-muted-foreground/25 hover:border-primary hover:bg-muted/50"
                }`}
              >
                {uploadingMain ? (
                  <Loader2 className="h-6 w-6 animate-spin mx-auto text-muted-foreground" />
                ) : (
                  <>
                    <Upload className="h-6 w-6 mx-auto mb-1 text-muted-foreground" />
                    <p className="text-xs text-muted-foreground">
                      Prevuci sliku ili klikni za upload
                    </p>
                  </>
                )}
              </div>
              <input
                type="file"
                ref={mainFileRef}
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) uploadFile(file, setMainImage, setUploadingMain);
                  e.target.value = "";
                }}
                hidden
                accept="image/jpeg,image/png,image/webp"
              />

              <Input
                id="mainImage"
                value={mainImage}
                onChange={(e) => setMainImage(e.target.value)}
                placeholder="ili unesite URL ručno"
                className="text-xs"
              />
            </div>
          </div>

          <div className="flex items-center space-x-2 pt-2">
            <Switch
              id="published"
              checked={published}
              onCheckedChange={setPublished}
            />
            <Label htmlFor="published">Objavljeno (vidljivo korisnicima)</Label>
          </div>

          {error && (
            <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
          )}

          <div className="flex justify-end pt-4">
            <Button type="submit" disabled={saving || !hasChanges}>
              {saving ? "Čuvanje..." : "Sačuvaj izmene"}
            </Button>
          </div>
        </form>
      </Card>

      {/* Variants Section */}
      <Card className="p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold">Varijante</h2>
          <Button onClick={openAddVariant} size="sm">
            Dodaj varijantu
          </Button>
        </div>

        {accessory.variants.length === 0 ? (
          <p className="text-muted-foreground text-center py-8">
            Nema varijanti. Dodajte prvu varijantu.
          </p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-16">Slika</TableHead>
                <TableHead>Naziv</TableHead>
                <TableHead>Cena (RSD)</TableHead>
                <TableHead className="w-24">Akcije</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {accessory.variants.map((variant) => (
                <TableRow key={variant.id}>
                  <TableCell>
                    {variant.image ? (
                      <img
                        src={variant.image}
                        alt={variant.name}
                        className="w-10 h-10 object-cover rounded"
                      />
                    ) : (
                      <div className="w-10 h-10 bg-gray-200 rounded flex items-center justify-center text-xs text-gray-500">
                        -
                      </div>
                    )}
                  </TableCell>
                  <TableCell className="font-medium">{variant.name}</TableCell>
                  <TableCell>
                    {variant.price.toLocaleString("sr-RS")} RSD
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => openEditVariant(variant)}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            disabled={deletingVariantId === variant.id}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>
                              Obrisati varijantu?
                            </AlertDialogTitle>
                            <AlertDialogDescription>
                              Varijanta &quot;{variant.name}&quot; će biti
                              trajno obrisana.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Otkaži</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() => handleDeleteVariant(variant.id)}
                              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                            >
                              Obriši
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </Card>

      {/* Add/Edit Variant Dialog */}
      <Dialog open={variantDialogOpen} onOpenChange={setVariantDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingVariant ? "Uredi varijantu" : "Dodaj varijantu"}
            </DialogTitle>
            <DialogDescription>
              {editingVariant
                ? "Izmeni podatke varijante"
                : "Dodaj novu varijantu za ovaj dodatak"}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="variantName">Naziv *</Label>
              <Input
                id="variantName"
                value={variantName}
                onChange={(e) => setVariantName(e.target.value)}
                placeholder="npr. Slow-mo"
              />
            </div>
            <div className="space-y-2">
              <Label>Slika varijante</Label>

              {variantImage && (
                <div className="relative w-24 h-24 mb-2">
                  <img
                    src={variantImage}
                    alt="Preview"
                    className="w-full h-full object-cover rounded border"
                  />
                  <button
                    type="button"
                    onClick={() => setVariantImage("")}
                    className="absolute -top-2 -right-2 bg-destructive text-destructive-foreground rounded-full p-1 hover:bg-destructive/90"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
              )}

              <div
                onDragOver={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                }}
                onDrop={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  const file = e.dataTransfer.files?.[0];
                  if (file?.type.startsWith("image/"))
                    uploadFile(file, setVariantImage, setUploadingVariantImg);
                }}
                onClick={() => variantFileRef.current?.click()}
                className={`border-2 border-dashed rounded-lg p-4 text-center cursor-pointer transition-colors ${
                  uploadingVariantImg
                    ? "border-muted bg-muted/50"
                    : "border-muted-foreground/25 hover:border-primary hover:bg-muted/50"
                }`}
              >
                {uploadingVariantImg ? (
                  <Loader2 className="h-6 w-6 animate-spin mx-auto text-muted-foreground" />
                ) : (
                  <>
                    <Upload className="h-6 w-6 mx-auto mb-1 text-muted-foreground" />
                    <p className="text-xs text-muted-foreground">
                      Prevuci ili klikni za upload
                    </p>
                  </>
                )}
              </div>
              <input
                type="file"
                ref={variantFileRef}
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file)
                    uploadFile(file, setVariantImage, setUploadingVariantImg);
                  e.target.value = "";
                }}
                hidden
                accept="image/jpeg,image/png,image/webp"
              />

              <Input
                id="variantImage"
                value={variantImage}
                onChange={(e) => setVariantImage(e.target.value)}
                placeholder="ili unesite URL ručno"
                className="text-xs"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="variantPrice">Cena (RSD) *</Label>
              <Input
                id="variantPrice"
                type="number"
                step="1"
                min="0"
                value={variantPrice}
                onChange={(e) => setVariantPrice(e.target.value)}
                placeholder="npr. 1200"
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setVariantDialogOpen(false)}
            >
              Otkaži
            </Button>
            <Button
              onClick={handleVariantSubmit}
              disabled={savingVariant || !variantName || !variantPrice}
            >
              {savingVariant
                ? "Čuvanje..."
                : editingVariant
                  ? "Sačuvaj"
                  : "Dodaj"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
