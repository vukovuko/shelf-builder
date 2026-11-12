import { ClientOnly } from "@tanstack/react-router";
import { lazy, Suspense } from "react";
import type { DesignerMode } from "@/lib/designer-mode";

// The configurator is a WebGL app: nothing of it can be drawn on the server.
// Importing it only in the browser build also keeps three.js and the rest of
// its code out of the Worker.
const Designer = import.meta.env.SSR ? null : lazy(() => import("./Designer"));

const blank = <div className="h-screen bg-background" />;

export function DesignerShell({ mode }: { mode: DesignerMode }) {
  return (
    <ClientOnly fallback={blank}>
      <Suspense fallback={blank}>
        {Designer && <Designer mode={mode} />}
      </Suspense>
    </ClientOnly>
  );
}
