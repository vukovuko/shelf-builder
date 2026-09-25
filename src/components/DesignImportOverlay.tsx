"use client";

import { Loader2 } from "lucide-react";
import { useDesignImportStatus } from "@/lib/design-import/import-status";

/** Covers the 3D view while an uploaded sketch is being read. */
export function DesignImportOverlay() {
  const pending = useDesignImportStatus((s) => s.pending);
  if (!pending) return null;
  return (
    <div className="absolute inset-0 z-30 flex flex-col items-center justify-center gap-3 bg-background/70 backdrop-blur-sm">
      <Loader2 className="size-8 animate-spin text-primary" />
      <p className="text-sm font-medium">Učitavam skicu…</p>
    </div>
  );
}
