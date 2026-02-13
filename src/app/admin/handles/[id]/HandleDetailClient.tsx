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

interface HandleFinish {
  id: number;
  handleId: number;
  legacyId: string | null;
  name: string;
  image: string | null;
  price: number;
  costPrice: number;
  createdAt: string;
  updatedAt: string;
}

interface Handle {
  id: number;
  legacyId: string | null;
  name: string;
  description: string | null;
  mainImage: string | null;
  published: boolean;
  createdAt: string;
  updatedAt: string;
  finishes: HandleFinish[];
}

interface HandleDetailClientProps {
  handle: Handle;
}

export function HandleDetailClient({
  handle: initialHandle,
}: HandleDetailClientProps) {
  const router = useRouter();
  const [handle, setHandle] = useState(initialHandle);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Handle form state
  const [name, setName] = useState(initialHandle.name);
  const [description, setDescription] = useState(
    initialHandle.description ?? "",
  );
  const [mainImage, setMainImage] = useState(initialHandle.mainImage ?? "");
  const [published, setPublished] = useState(initialHandle.published);

  // Finish dialog state
  const [finishDialogOpen, setFinishDialogOpen] = useState(false);
  const [editingFinish, setEditingFinish] = useState<HandleFinish | null>(null);
  const [finishName, setFinishName] = useState("");
  const [finishImage, setFinishImage] = useState("");
  const [finishPrice, setFinishPrice] = useState("");
  const [savingFinish, setSavingFinish] = useState(false);
  const [deletingFinishId, setDeletingFinishId] = useState<number | null>(null);

  // Upload state
  const [uploadingMain, setUploadingMain] = useState(false);
  const [uploadingFinishImg, setUploadingFinishImg] = useState(false);
  const mainFileRef = useRef<HTMLInputElement>(null);
  const finishFileRef = useRef<HTMLInputElement>(null);

  const uploadFile = async (
    file: File,
    setUrl: (url: string) => void,
    setLoading: (v: boolean) => void,
  ) => {
    setLoading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("folder", "handles");
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
    if (name !== handle.name) return true;
    if ((description || null) !== handle.description) return true;
    if ((mainImage || null) !== handle.mainImage) return true;
    if (published !== handle.published) return true;
    return false;
  }, [name, description, mainImage, published, handle]);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setSaving(true);
    setError(null);

    const data = {
      name,
      description: description || null,
      mainImage: mainImage || null,
      published,
    };

    try {
      const res = await fetch(`/api/admin/handles/${handle.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      if (!res.ok) {
        const json = await res.json();
        throw new Error(json.error || "Greška pri čuvanju");
      }

      const updated = await res.json();
      setHandle(updated);
      setName(updated.name);
      setDescription(updated.description ?? "");
      setMainImage(updated.mainImage ?? "");
      setPublished(updated.published);
      toast.success("Ručka sačuvana");
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
      const res = await fetch(`/api/admin/handles/${handle.id}`, {
        method: "DELETE",
      });

      if (!res.ok) {
        const json = await res.json();
        throw new Error(json.error || "Greška pri brisanju");
      }

      toast.success("Ručka obrisana");
      router.push("/admin/handles");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Greška pri brisanju");
      setDeleting(false);
    }
  };

  const openAddFinish = () => {
    setEditingFinish(null);
    setFinishName("");
    setFinishImage("");
    setFinishPrice("");
    setFinishDialogOpen(true);
  };

  const openEditFinish = (finish: HandleFinish) => {
    setEditingFinish(finish);
    setFinishName(finish.name);
    setFinishImage(finish.image ?? "");
    setFinishPrice(String(finish.price));
    setFinishDialogOpen(true);
  };

  const handleFinishSubmit = async () => {
    setSavingFinish(true);
    try {
      const data = {
        name: finishName,
        image: finishImage || null,
        price: Number(finishPrice),
      };

      let res;
      if (editingFinish) {
        res = await fetch(
          `/api/admin/handles/${handle.id}/finishes/${editingFinish.id}`,
          {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(data),
          },
        );
      } else {
        res = await fetch(`/api/admin/handles/${handle.id}/finishes`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(data),
        });
      }

      if (!res.ok) {
        const json = await res.json();
        throw new Error(json.error || "Greška");
      }

      toast.success(editingFinish ? "Obrada ažurirana" : "Obrada dodana");
      setFinishDialogOpen(false);

      // Re-fetch handle to update local state (router.refresh only updates server component props)
      const freshRes = await fetch(`/api/admin/handles/${handle.id}`);
      if (freshRes.ok) {
        const fresh = await freshRes.json();
        setHandle(fresh);
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Greška");
    } finally {
      setSavingFinish(false);
    }
  };

  const handleDeleteFinish = async (finishId: number) => {
    setDeletingFinishId(finishId);
    try {
      const res = await fetch(
        `/api/admin/handles/${handle.id}/finishes/${finishId}`,
        {
          method: "DELETE",
        },
      );

      if (!res.ok) {
        const json = await res.json();
        throw new Error(json.error || "Greška pri brisanju");
      }

      toast.success("Obrada obrisana");

      const freshRes = await fetch(`/api/admin/handles/${handle.id}`);
      if (freshRes.ok) {
        const fresh = await freshRes.json();
        setHandle(fresh);
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Greška pri brisanju");
    } finally {
      setDeletingFinishId(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-4 min-w-0">
          <Button variant="ghost" size="icon" asChild className="shrink-0">
            <Link href="/admin/handles">
              <ArrowLeft className="h-5 w-5" />
            </Link>
          </Button>
          <div className="min-w-0">
            <Popover>
              <PopoverTrigger asChild>
                <h1 className="text-2xl sm:text-3xl font-semibold truncate cursor-pointer">
                  {handle.name}
                </h1>
              </PopoverTrigger>
              <PopoverContent
                side="bottom"
                className="w-auto max-w-xs p-2 text-sm"
              >
                {handle.name}
              </PopoverContent>
            </Popover>
            <div
              className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium mt-1 ${
                handle.published
                  ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200"
                  : "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200"
              }`}
            >
              {handle.published ? "Objavljeno" : "Draft"}
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
              <AlertDialogTitle>Obrisati ručku?</AlertDialogTitle>
              <AlertDialogDescription>
                Ova akcija je nepovratna. Ručka &quot;{handle.name}&quot; će
                biti trajno obrisana zajedno sa svim završnim obradama.
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
                placeholder="npr. Ručka 1"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Opis</Label>
              <Input
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="npr. Standard ručka 128mm"
              />
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
            <Label htmlFor="published">
              Objavljeno (vidljivo korisnicima na /design)
            </Label>
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

      {/* Finishes Section */}
      <Card className="p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold">Završne obrade</h2>
          <Button onClick={openAddFinish} size="sm">
            Dodaj obradu
          </Button>
        </div>

        {handle.finishes.length === 0 ? (
          <p className="text-muted-foreground text-center py-8">
            Nema završnih obrada. Dodajte prvu obradu.
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
              {handle.finishes.map((finish) => (
                <TableRow key={finish.id}>
                  <TableCell>
                    {finish.image ? (
                      <img
                        src={finish.image}
                        alt={finish.name}
                        className="w-10 h-10 object-cover rounded"
                      />
                    ) : (
                      <div className="w-10 h-10 bg-gray-200 rounded flex items-center justify-center text-xs text-gray-500">
                        -
                      </div>
                    )}
                  </TableCell>
                  <TableCell className="font-medium">{finish.name}</TableCell>
                  <TableCell>
                    {finish.price.toLocaleString("sr-RS")} RSD
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => openEditFinish(finish)}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            disabled={deletingFinishId === finish.id}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>
                              Obrisati obradu?
                            </AlertDialogTitle>
                            <AlertDialogDescription>
                              Obrada &quot;{finish.name}&quot; će biti trajno
                              obrisana.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Otkaži</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() => handleDeleteFinish(finish.id)}
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

      {/* Add/Edit Finish Dialog */}
      <Dialog open={finishDialogOpen} onOpenChange={setFinishDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingFinish ? "Uredi obradu" : "Dodaj obradu"}
            </DialogTitle>
            <DialogDescription>
              {editingFinish
                ? "Izmeni podatke završne obrade"
                : "Dodaj novu završnu obradu za ovu ručku"}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="finishName">Naziv *</Label>
              <Input
                id="finishName"
                value={finishName}
                onChange={(e) => setFinishName(e.target.value)}
                placeholder="npr. Chrome"
              />
            </div>
            <div className="space-y-2">
              <Label>Slika obrade</Label>

              {finishImage && (
                <div className="relative w-24 h-24 mb-2">
                  <img
                    src={finishImage}
                    alt="Preview"
                    className="w-full h-full object-cover rounded border"
                  />
                  <button
                    type="button"
                    onClick={() => setFinishImage("")}
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
                    uploadFile(file, setFinishImage, setUploadingFinishImg);
                }}
                onClick={() => finishFileRef.current?.click()}
                className={`border-2 border-dashed rounded-lg p-4 text-center cursor-pointer transition-colors ${
                  uploadingFinishImg
                    ? "border-muted bg-muted/50"
                    : "border-muted-foreground/25 hover:border-primary hover:bg-muted/50"
                }`}
              >
                {uploadingFinishImg ? (
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
                ref={finishFileRef}
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file)
                    uploadFile(file, setFinishImage, setUploadingFinishImg);
                  e.target.value = "";
                }}
                hidden
                accept="image/jpeg,image/png,image/webp"
              />

              <Input
                id="finishImage"
                value={finishImage}
                onChange={(e) => setFinishImage(e.target.value)}
                placeholder="ili unesite URL ručno"
                className="text-xs"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="finishPrice">Cena (RSD) *</Label>
              <Input
                id="finishPrice"
                type="number"
                step="1"
                min="0"
                value={finishPrice}
                onChange={(e) => setFinishPrice(e.target.value)}
                placeholder="npr. 590"
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setFinishDialogOpen(false)}
            >
              Otkaži
            </Button>
            <Button
              onClick={handleFinishSubmit}
              disabled={savingFinish || !finishName || !finishPrice}
            >
              {savingFinish
                ? "Čuvanje..."
                : editingFinish
                  ? "Sačuvaj"
                  : "Dodaj"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
