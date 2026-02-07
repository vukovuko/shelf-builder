"use client";

import { ArrowLeft, Copy, Loader2, Lock } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { useShelfStore, type ShelfState } from "@/lib/store";

export function LockedPreviewBar() {
  const router = useRouter();
  const [isDuplicating, setIsDuplicating] = useState(false);
  const loadedWardrobeId = useShelfStore((s: ShelfState) => s.loadedWardrobeId);
  const setIsPreviewMode = useShelfStore((s: ShelfState) => s.setIsPreviewMode);

  async function handleDuplicate() {
    if (!loadedWardrobeId || isDuplicating) return;
    setIsDuplicating(true);
    try {
      const res = await fetch(`/api/wardrobes/${loadedWardrobeId}`);
      if (!res.ok) {
        toast.error("Nije moguće učitati podatke ormana.");
        return;
      }
      const original = await res.json();

      const createRes = await fetch("/api/wardrobes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: `${original.name} (Kopija)`,
          data: original.data,
          thumbnail: original.thumbnail,
        }),
      });

      if (!createRes.ok) {
        if (createRes.status === 401) {
          toast.error("Niste prijavljeni. Prijavite se i pokušajte ponovo.");
        } else {
          toast.error("Nije moguće duplirati orman. Pokušajte ponovo.");
        }
        return;
      }

      const { id: newId } = await createRes.json();
      setIsPreviewMode(false);
      // Use window.location.href to reset hasLoadedRef in LoadFromUrl
      window.location.href = `/design?load=${newId}`;
      toast.success("Kopija je napravljena! Možete je slobodno menjati.");
    } catch (e) {
      console.error("Duplicate failed:", e);
      toast.error("Neočekivana greška. Proverite internet konekciju.");
    } finally {
      setIsDuplicating(false);
    }
  }

  function handleBack() {
    setIsPreviewMode(false);
    router.push("/wardrobes");
  }

  return (
    <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-30 flex items-center gap-3 px-4 py-2.5 bg-background/95 backdrop-blur border border-border rounded-xl shadow-lg">
      <div className="flex items-center gap-2 text-amber-500">
        <Lock className="h-4 w-4 flex-shrink-0" />
        <span className="text-sm font-medium whitespace-nowrap hidden sm:inline">
          Ovaj orman je zaključan
        </span>
      </div>
      <div className="w-px h-6 bg-border" />
      <Button
        size="sm"
        onClick={handleDuplicate}
        disabled={isDuplicating || !loadedWardrobeId}
      >
        {isDuplicating ? (
          <Loader2 className="h-4 w-4 mr-1 animate-spin" />
        ) : (
          <Copy className="h-4 w-4 mr-1" />
        )}
        Dupliraj i izmeni
      </Button>
      <Button variant="ghost" size="sm" onClick={handleBack}>
        <ArrowLeft className="h-4 w-4 mr-1" />
        Nazad
      </Button>
    </div>
  );
}
