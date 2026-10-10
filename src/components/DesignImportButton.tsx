"use client";

import { Camera, ImageUp, Loader2, Sparkles } from "lucide-react";
import posthog from "posthog-js";
import { useId, useLayoutEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { importWardrobeDraft } from "@/lib/design-import/apply";
import { MAX_DESCRIPTION_CHARS } from "@/lib/design-import/config";
import {
  type ImportSource,
  useDesignImportStatus,
} from "@/lib/design-import/import-status";
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
import { cn } from "@/lib/utils";

type Previous = {
  snapshot: ReturnType<typeof getWardrobeSnapshot>;
  loadedId: string | null;
  loadedIsModel: boolean;
};

type Source = ImportSource | "both";

const MADE_FROM: Record<Source, string> = {
  image: "po slici",
  text: "po opisu",
  both: "po slici i opisu",
};

const NOT_RECOGNIZED: Record<Source, string> = {
  image: "Nismo prepoznali orman na slici.",
  text: "Nismo prepoznali orman u opisu. Napišite mere i šta ide u koju kolonu.",
  both: "Nismo prepoznali orman ni na slici ni u opisu.",
};

const MIN_DESCRIPTION_CHARS = 3;

function restore(previous: Previous) {
  const st = useShelfStore.getState();
  st.resetToDefaults();
  applyWardrobeSnapshot(previous.snapshot);
  if (previous.loadedId) {
    st.setLoadedWardrobe(previous.loadedId, previous.loadedIsModel);
  }
  st.triggerFitToView();
}

/**
 * Builds the configurator's wardrobe from a photo or sketch, from a written
 * description, or from both (a photo sent with text filled in carries it).
 */
export function DesignImportButton({ className }: { className?: string }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const cameraRef = useRef<HTMLInputElement>(null);
  const textRef = useRef<HTMLTextAreaElement>(null);
  const textId = useId();
  const [text, setText] = useState("");
  const [busy, setBusy] = useState<ImportSource | null>(null);
  const [result, setResult] = useState<{
    adjustments: Adjustment[];
    previous: Previous;
    source: Source;
  } | null>(null);

  // Grows with the text so the whole description stays readable.
  // biome-ignore lint/correctness/useExhaustiveDependencies: re-measure on every change
  useLayoutEffect(() => {
    const el = textRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${el.scrollHeight + 2}px`;
  }, [text]);

  const description = text.trim();

  async function build(
    payload: { data?: string; mediaType?: string; text?: string },
    source: Source,
  ) {
    const res = await fetch("/api/design-import", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const body = await res.json().catch(() => ({}));
    if (!res.ok) {
      toast.error(
        body.error ?? body.message ?? "Nije uspelo. Pokušajte ponovo.",
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
      source,
      status: outcome.status,
      adjustments: outcome.adjustments.map((a) => a.code),
    });

    if (outcome.status === "empty") {
      toast.error(NOT_RECOGNIZED[source]);
      return;
    }
    useShelfStore.getState().triggerFitToView();

    if (outcome.adjustments.length === 0) {
      toast.success(`Orman je napravljen ${MADE_FROM[source]}`, {
        action: {
          label: "Vrati prethodni",
          onClick: () => restore(previous),
        },
      });
      return;
    }
    setResult({ adjustments: outcome.adjustments, previous, source });
  }

  async function handleFile(file: File) {
    setBusy("image");
    useDesignImportStatus.getState().setPending("image");
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
      const withText = description.length >= MIN_DESCRIPTION_CHARS;
      await build(
        withText ? { ...image, text: description } : image,
        withText ? "both" : "image",
      );
    } catch (error) {
      console.error("Design import failed:", error);
      toast.error("Čitanje slike nije uspelo. Pokušajte ponovo.");
    } finally {
      setBusy(null);
      useDesignImportStatus.getState().setPending(null);
      for (const input of [inputRef.current, cameraRef.current]) {
        if (input) input.value = "";
      }
    }
  }

  async function handleText() {
    if (busy || description.length < MIN_DESCRIPTION_CHARS) return;
    setBusy("text");
    useDesignImportStatus.getState().setPending("text");
    try {
      await build({ text: description }, "text");
    } catch (error) {
      console.error("Design import failed:", error);
      toast.error("Pravljenje ormana nije uspelo. Pokušajte ponovo.");
    } finally {
      setBusy(null);
      useDesignImportStatus.getState().setPending(null);
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

      <div className={cn("mb-4 space-y-3", className)}>
        {busy === "image" ? (
          <Button type="button" variant="outline" className="w-full" disabled>
            <Loader2 className="animate-spin" />
            Učitavam skicu…
          </Button>
        ) : (
          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              className="hidden flex-1 pointer-coarse:inline-flex"
              disabled={busy !== null}
              onClick={() => cameraRef.current?.click()}
            >
              <Camera />
              Uslikaj
            </Button>
            <Button
              type="button"
              variant="outline"
              className="flex-1"
              disabled={busy !== null}
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

        <div className="space-y-1.5">
          <label htmlFor={textId} className="text-sm font-medium">
            Ili opišite orman
          </label>
          <Textarea
            ref={textRef}
            id={textId}
            value={text}
            maxLength={MAX_DESCRIPTION_CHARS}
            readOnly={busy !== null}
            rows={3}
            placeholder="Npr. orman 240 × 260 × 60 cm, 4 kolone. U prvoj 5 polica, u drugoj šipka, u trećoj 3 fioke, klizna vrata."
            className="field-sizing-fixed min-h-24 max-h-[35vh] resize-none overflow-y-auto md:max-h-[50vh]"
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => {
              if (
                e.key === "Enter" &&
                (e.metaKey || e.ctrlKey) &&
                !e.nativeEvent.isComposing
              ) {
                e.preventDefault();
                void handleText();
              }
            }}
          />
          <p className="text-xs text-muted-foreground">
            Napišite mere i šta ide u koju kolonu, na srpskom ili engleskom.
            Orman se napravi odmah i dalje ga menjate kao i inače.
            {text.length > MAX_DESCRIPTION_CHARS - 200 && (
              <span className="ml-1 tabular-nums">
                ({text.length}/{MAX_DESCRIPTION_CHARS})
              </span>
            )}
          </p>
          <Button
            type="button"
            className="w-full"
            disabled={
              busy !== null || description.length < MIN_DESCRIPTION_CHARS
            }
            onClick={() => void handleText()}
          >
            {busy === "text" ? (
              <Loader2 className="animate-spin" />
            ) : (
              <Sparkles />
            )}
            {busy === "text" ? "Pravim orman…" : "Napravi orman"}
          </Button>
        </div>
      </div>

      <Dialog open={!!result} onOpenChange={(open) => !open && setResult(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              Orman je napravljen {result ? MADE_FROM[result.source] : ""}
            </DialogTitle>
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
