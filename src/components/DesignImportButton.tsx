"use client";

import { Camera, ImageUp, Loader2 } from "lucide-react";
import posthog from "posthog-js";
import { useRef, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { importWardrobeDraft } from "@/lib/design-import/apply";
import { useDesignImportStatus } from "@/lib/design-import/import-status";
import type { Adjustment } from "@/lib/design-import/plan";
import {
  shrinkImageForUpload,
  UnsupportedImageError,
} from "@/lib/design-import/resize-image";
import {
  applyWardrobeSnapshot,
  getWardrobeSnapshot,
} from "@/lib/serializeWardrobe";
import { useShelfStore } from "@/lib/store";

type Previous = {
  snapshot: ReturnType<typeof getWardrobeSnapshot>;
  loadedId: string | null;
  loadedIsModel: boolean;
};

function restore(previous: Previous) {
  const st = useShelfStore.getState();
  st.resetToDefaults();
  applyWardrobeSnapshot(previous.snapshot);
  if (previous.loadedId) {
    st.setLoadedWardrobe(previous.loadedId, previous.loadedIsModel);
  }
  st.triggerFitToView();
}

/** Upload a photo or sketch and rebuild the configurator from it. */
export function DesignImportButton() {
  const inputRef = useRef<HTMLInputElement>(null);
  const cameraRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<{
    adjustments: Adjustment[];
    previous: Previous;
  } | null>(null);

  async function handleFile(file: File) {
    setBusy(true);
    useDesignImportStatus.getState().setPending(true);
    try {
      let image: Awaited<ReturnType<typeof shrinkImageForUpload>>;
      try {
        image = await shrinkImageForUpload(file);
      } catch (error) {
        if (error instanceof UnsupportedImageError) {
          toast.error("Ovaj format slike nije podržan. Pošaljite JPG ili PNG.");
          return;
        }
        throw error;
      }

      const res = await fetch("/api/design-import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(image),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.error(
          body.error ??
            body.message ??
            "Čitanje slike nije uspelo. Pokušajte ponovo.",
        );
        return;
      }

      const st = useShelfStore.getState();
      const previous: Previous = {
        snapshot: getWardrobeSnapshot(),
        loadedId: st.loadedWardrobeId,
        loadedIsModel: st.loadedWardrobeIsModel,
      };
      const outcome = importWardrobeDraft(body.draft);
      posthog.capture("design_import", {
        status: outcome.status,
        adjustments: outcome.adjustments.map((a) => a.code),
      });

      if (outcome.status === "empty") {
        toast.error("Nismo prepoznali orman na slici.");
        return;
      }
      useShelfStore.getState().triggerFitToView();

      if (outcome.adjustments.length === 0) {
        toast.success("Orman je napravljen po slici", {
          action: {
            label: "Vrati prethodni",
            onClick: () => restore(previous),
          },
        });
        return;
      }
      setResult({ adjustments: outcome.adjustments, previous });
    } catch (error) {
      console.error("Design import failed:", error);
      toast.error("Čitanje slike nije uspelo. Pokušajte ponovo.");
    } finally {
      setBusy(false);
      useDesignImportStatus.getState().setPending(false);
      for (const input of [inputRef.current, cameraRef.current]) {
        if (input) input.value = "";
      }
    }
  }

  return (
    <>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) void handleFile(file);
        }}
      />
      {/* Opens the phone's camera app directly; desktops ignore `capture`,
          so this button only shows on touch screens. */}
      <input
        ref={cameraRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) void handleFile(file);
        }}
      />
      {busy ? (
        <Button
          type="button"
          variant="outline"
          className="w-full mb-4"
          disabled
        >
          <Loader2 className="animate-spin" />
          Čitam skicu…
        </Button>
      ) : (
        <div className="mb-4 flex gap-2">
          <Button
            type="button"
            variant="outline"
            className="hidden flex-1 pointer-coarse:inline-flex"
            onClick={() => cameraRef.current?.click()}
          >
            <Camera />
            Uslikaj
          </Button>
          <Button
            type="button"
            variant="outline"
            className="flex-1"
            onClick={() => inputRef.current?.click()}
          >
            <ImageUp />
            <span className="pointer-coarse:hidden">
              Učitaj skicu ili sliku
            </span>
            <span className="hidden pointer-coarse:inline">Iz galerije</span>
          </Button>
        </div>
      )}

      <Dialog open={!!result} onOpenChange={(open) => !open && setResult(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Orman je napravljen po slici</DialogTitle>
          </DialogHeader>
          <ul className="list-disc space-y-1 pl-5 text-sm text-muted-foreground">
            {result?.adjustments.map((a) => (
              <li key={`${a.code}-${a.message}`}>{a.message}</li>
            ))}
          </ul>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                if (result) restore(result.previous);
                setResult(null);
              }}
            >
              Vrati prethodni
            </Button>
            <Button onClick={() => setResult(null)}>U redu</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
