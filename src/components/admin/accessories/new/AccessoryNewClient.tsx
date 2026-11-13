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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const FORM_ID = "new-accessory-form";

type AccessoryCategory =
  | "general"
  | "hinge"
  | "drawer_slide"
  | "sliding_door_track";

const categoryOptions: Array<{ value: AccessoryCategory; label: string }> = [
  { value: "general", label: "Opšti okov" },
  { value: "hinge", label: "Šarke" },
  { value: "drawer_slide", label: "Klizači za fioke" },
  { value: "sliding_door_track", label: "Šine za klizna vrata" },
];

export default function NewAccessoryPage() {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  // Typing in any field. The pickers below have their own state.
  const [touched, setTouched] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [published, setPublished] = useState(false);
  const [category, setCategory] = useState<AccessoryCategory>("general");

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
      category,
    };

    try {
      const res = await adminFetch("/api/admin/accessories", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      if (!res.ok) {
        const json = await res.json();
        throw new Error(json.error || "Greška pri čuvanju");
      }

      const created = await res.json();
      toast.success("Okov dodat");
      router.push(`/admin/accessories/${created.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Greška pri čuvanju");
      toast.error(err instanceof Error ? err.message : "Greška pri čuvanju");
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <SaveBar
        form={FORM_ID}
        dirty={touched || published || category !== "general"}
        saving={saving}
      />

      <PageHeader backHref="/admin/accessories" title="Novi okov">
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
              <Input id="name" name="name" required placeholder="npr. Klizač" />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Opis</Label>
              <Input
                id="description"
                name="description"
                placeholder="npr. Šarka sa usporivačem"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="category">Kategorija</Label>
              <Select
                value={category}
                onValueChange={(value) =>
                  setCategory(value as AccessoryCategory)
                }
              >
                <SelectTrigger id="category">
                  <SelectValue placeholder="Izaberi kategoriju" />
                </SelectTrigger>
                <SelectContent>
                  {categoryOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="mainImage">URL glavne slike</Label>
              <Input
                id="mainImage"
                name="mainImage"
                placeholder="npr. /accessories/klizac.png"
              />
            </div>
          </div>

          <p className="text-sm text-muted-foreground">
            Nakon kreiranja okova, možete dodati varijante sa njihovim cenama,
            na primer obična i slow motion šarka.
          </p>

          {error && (
            <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
          )}
        </form>
      </Card>
    </div>
  );
}
