"use client";

import { useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import { toast } from "sonner";
import { Scene } from "@/components/Scene";
import { useSession } from "@/lib/auth-client";
import { applyWardrobeSnapshot } from "@/lib/serializeWardrobe";

// Separate component for URL param handling - wrapped in Suspense
function LoadFromUrl() {
  const searchParams = useSearchParams();
  const loadId = searchParams.get("load");
  const [hasLoadedFromUrl, setHasLoadedFromUrl] = useState(false);

  useEffect(() => {
    async function loadWardrobe() {
      if (!loadId || hasLoadedFromUrl) return;

      try {
        const res = await fetch(`/api/wardrobes/${loadId}`);
        if (!res.ok) {
          toast.error("Failed to load wardrobe");
          return;
        }

        const wardrobe = await res.json();
        applyWardrobeSnapshot(wardrobe.data);
        toast.success(`Loaded: ${wardrobe.name}`);

        window.history.replaceState({}, "", "/design");
        setHasLoadedFromUrl(true);
      } catch (e) {
        console.error("Failed to load wardrobe", e);
        toast.error("Failed to load wardrobe");
      }
    }

    loadWardrobe();
  }, [loadId, hasLoadedFromUrl]);

  return null;
}

export default function DesignPage(props: any) {
  const { data: session } = useSession();
  const [hasRestoredState, setHasRestoredState] = useState(false);
  const [isSceneLoading, setIsSceneLoading] = useState(true);

  // State persistence: Restore pending work after login
  useEffect(() => {
    if (session && !hasRestoredState) {
      const pendingState = localStorage.getItem("pendingWardrobeState");
      if (pendingState) {
        try {
          const state = JSON.parse(pendingState);

          // Validate parsed state
          if (!state || typeof state !== "object") {
            throw new Error("Invalid state");
          }

          applyWardrobeSnapshot(state);
          localStorage.removeItem("pendingWardrobeState");
          toast.success("Welcome back! Your work has been restored.");
        } catch (_e) {
          // Just clear invalid data, don't crash
          localStorage.removeItem("pendingWardrobeState");
        }
      }
      setHasRestoredState(true);
    }
  }, [session, hasRestoredState]);

  // Hide loading overlay after scene initializes
  useEffect(() => {
    const timer = setTimeout(() => {
      setIsSceneLoading(false);
    }, 1500); // Give WebGL context time to initialize

    return () => clearTimeout(timer);
  }, []);

  return (
    <>
      {/* Loading overlay - positioned above scene but doesn't prevent mounting */}
      {isSceneLoading && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-background">
          <div className="flex flex-col items-center gap-4 text-center">
            <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin" />
            <div className="flex flex-col gap-2">
              <p className="text-base text-foreground font-medium">
                Dizajnirajte vaš orman po želji
              </p>
              <p className="text-sm text-muted-foreground">
                Učitavanje, molimo sačekajte...
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Only wrap URL loading in Suspense - not the Scene */}
      <Suspense fallback={null}>
        <LoadFromUrl />
      </Suspense>
      {/* Scene stays mounted and stable */}
      <Scene {...props} />
    </>
  );
}
