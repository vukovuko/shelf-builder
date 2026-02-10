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
import { Switch } from "@/components/ui/switch";

export default function NewHandlePage() {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [published, setPublished] = useState(false);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setSaving(true);
    setError(null);

    const formData = new FormData(e.currentTarget);
    const data = {
      name: formData.get("name") as string,
      description: (formData.get("description") as string) || undefined,
      mainImage: (formData.get("mainImage") as string) || undefined,
      published,
    };

    try {
      const res = await fetch("/api/admin/handles", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      if (!res.ok) {
        const json = await res.json();
        throw new Error(json.error || "Greška pri čuvanju");
      }

      const created = await res.json();
      toast.success("Ručka dodata");
      // Redirect to detail page to add finishes
      router.push(`/admin/handles/${created.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Greška pri čuvanju");
      toast.error(err instanceof Error ? err.message : "Greška pri čuvanju");
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/admin/handles">
            <ArrowLeft className="h-5 w-5" />
          </Link>
        </Button>
        <div>
          <h1 className="text-2xl sm:text-3xl font-semibold">Nova ručka</h1>
          <p className="text-sm sm:text-base text-muted-foreground">
            Dodaj novu ručku za vrata
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
                placeholder="npr. Ručka 1"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Opis</Label>
              <Input
                id="description"
                name="description"
                placeholder="npr. Standard ručka 128mm"
              />
            </div>

            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="mainImage">URL glavne slike</Label>
              <Input
                id="mainImage"
                name="mainImage"
                placeholder="npr. /handles/handle_1/handle_1.png"
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

          <p className="text-sm text-muted-foreground">
            Nakon kreiranja ručke, možete dodati završne obrade (Chrome,
            Aluminium, itd.) sa njihovim cenama.
          </p>

          {error && (
            <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
          )}

          <div className="flex justify-end gap-2 pt-4">
            <Button type="button" variant="outline" asChild>
              <Link href="/admin/handles">Odustani</Link>
            </Button>
            <Button type="submit" disabled={saving}>
              {saving ? "Čuvanje..." : "Dodaj ručku"}
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
}
