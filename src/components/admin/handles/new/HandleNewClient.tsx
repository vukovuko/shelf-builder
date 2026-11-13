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

const FORM_ID = "new-handle-form";

export default function NewHandlePage() {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  // Typing in any field. The pickers below have their own state.
  const [touched, setTouched] = useState(false);
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
      const res = await adminFetch("/api/admin/handles", {
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
      <SaveBar form={FORM_ID} dirty={touched || published} saving={saving} />

      <PageHeader backHref="/admin/accessories?tab=handles" title="Nova ručka">
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

          <p className="text-sm text-muted-foreground">
            Nakon kreiranja ručke, možete dodati završne obrade (Chrome,
            Aluminium, itd.) sa njihovim cenama.
          </p>

          {error && (
            <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
          )}
        </form>
      </Card>
    </div>
  );
}
