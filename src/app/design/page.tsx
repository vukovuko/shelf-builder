"use client";

import { useSearchParams } from "next/navigation";
import type React from "react";
import { Suspense, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { Scene } from "@/components/Scene";
import {
  autosaveDesignDraft,
  clearDesignDraft,
  readDesignDraft,
} from "@/lib/design-draft";
import { modelForHandle } from "@/lib/handle-models";
import {
  isBackMaterialCategory,
  isFrontMaterialCategory,
  isKorpusMaterialCategory,
} from "@/lib/material-categories";
import { cleanMaterialName } from "@/lib/material-pages";
import { applyWardrobeSnapshot } from "@/lib/serializeWardrobe";
import { type ShelfState, useShelfStore } from "@/lib/store";

// Separate component for URL param handling - wrapped in Suspense
// A quick reload brings the design back silently; after a longer break the
// toast also offers a fresh start.
const DRAFT_NOTICE_AFTER_MS = 60 * 60 * 1000;

function LoadFromUrl() {
  const searchParams = useSearchParams();
  const loadId = searchParams.get("load");
  const fromOrderId = searchParams.get("fromOrder");
  const orderNum = searchParams.get("orderNum");
  const fromWardrobeId = searchParams.get("fromWardrobe");
  const wardrobeName = searchParams.get("wardrobeName");
  const setLoadedWardrobe = useShelfStore(
    (s: ShelfState) => s.setLoadedWardrobe,
  );
  const setFromOrder = useShelfStore((s: ShelfState) => s.setFromOrder);
  const clearFromOrder = useShelfStore((s: ShelfState) => s.clearFromOrder);
  const setFromWardrobe = useShelfStore((s: ShelfState) => s.setFromWardrobe);
  const clearFromWardrobe = useShelfStore(
    (s: ShelfState) => s.clearFromWardrobe,
  );
  const setIsPreviewMode = useShelfStore((s: ShelfState) => s.setIsPreviewMode);
  // Use ref instead of state to persist across React Strict Mode remounts
  const hasLoadedRef = useRef(false);

  useEffect(() => {
    async function loadWardrobe() {
      if (!loadId || hasLoadedRef.current) return;

      // Mark as loaded immediately to prevent double execution
      hasLoadedRef.current = true;

      try {
        const res = await fetch(`/api/wardrobes/${loadId}`, {
          credentials: "include", // Ensure cookies are sent with request
        });
        if (!res.ok) {
          // Better error message for different status codes
          if (res.status === 401) {
            toast.error("Sesija je istekla. Prijavite se ponovo.");
          } else if (res.status === 404) {
            toast.error(
              "Orman nije pronađen. Možda je obrisan ili link nije validan.",
            );
          } else {
            toast.error(
              "Nije moguće učitati orman. Proverite internet konekciju.",
            );
          }
          hasLoadedRef.current = false; // Reset on error so user can retry
          return;
        }

        const wardrobe = await res.json();

        // Enable preview mode for locked wardrobes (read-only viewing)
        if (wardrobe.isLocked) {
          setIsPreviewMode(true);
        }

        applyWardrobeSnapshot(wardrobe.data);

        // Track loaded wardrobe for update functionality
        setLoadedWardrobe(wardrobe.id, wardrobe.isModel ?? false);

        // Track order context if coming from order detail page
        if (fromOrderId && orderNum) {
          setFromOrder(fromOrderId, parseInt(orderNum, 10));
        } else {
          // Clear any stale order context when loading without order params
          clearFromOrder();
        }

        // Track wardrobe context if coming from wardrobe preview page
        if (fromWardrobeId && wardrobeName) {
          setFromWardrobe(fromWardrobeId, decodeURIComponent(wardrobeName));
        } else {
          // Clear any stale wardrobe context when loading without wardrobe params
          clearFromWardrobe();
        }

        // Save snapshot for unsaved changes detection
        useShelfStore.getState().setLastSavedSnapshot(wardrobe.data);

        toast.success(`Učitano: ${wardrobe.name}`);

        window.history.replaceState({}, "", "/design");
      } catch (e) {
        console.error("Failed to load wardrobe", e);
        toast.error(
          "Neočekivana greška pri učitavanju. Proverite internet konekciju.",
        );
        hasLoadedRef.current = false; // Reset on error so user can retry
      }
    }

    loadWardrobe();
  }, [
    loadId,
    setLoadedWardrobe,
    fromOrderId,
    orderNum,
    setFromOrder,
    clearFromOrder,
    fromWardrobeId,
    wardrobeName,
    setFromWardrobe,
    clearFromWardrobe,
    setIsPreviewMode,
  ]);

  return null;
}

interface DesignPageProps {
  wardrobeRef?: React.RefObject<any>;
  isLoggedIn?: boolean;
}

export default function DesignPage({
  wardrobeRef,
  isLoggedIn,
}: DesignPageProps) {
  const [hasRestoredState, setHasRestoredState] = useState(false);
  const [isSceneLoading, setIsSceneLoading] = useState(true);

  // State persistence: Restore from localStorage on mount
  // Priority: 1. URL load param (handled by LoadFromUrl)
  //           2. pendingWardrobeState (login flow)
  //           3. the autosaved draft (lib/design-draft)
  useEffect(() => {
    if (hasRestoredState) return;

    // Check for URL load param - if present, LoadFromUrl will handle it
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get("load")) {
      setHasRestoredState(true);
      return;
    }

    // Try pendingWardrobeState first (login flow takes priority)
    const pendingState = localStorage.getItem("pendingWardrobeState");
    if (pendingState) {
      try {
        const state = JSON.parse(pendingState);
        if (state && typeof state === "object") {
          applyWardrobeSnapshot(state);
          localStorage.removeItem("pendingWardrobeState");
          if (isLoggedIn) {
            toast.success("Dobrodošli nazad! Vaš rad je sačuvan.");
          }
          setHasRestoredState(true);
          return;
        }
      } catch (_e) {
        localStorage.removeItem("pendingWardrobeState");
      }
    }

    const draft = readDesignDraft();
    if (draft) {
      // The store can still hold a design from another page (order previews
      // use it), so start clean before applying the draft.
      useShelfStore.getState().resetToDefaults();
      applyWardrobeSnapshot(draft.snapshot);
      if (Date.now() - draft.savedAt > DRAFT_NOTICE_AFTER_MS) {
        toast("Vraćen je vaš poslednji dizajn", {
          action: {
            label: "Novi dizajn",
            onClick: () => {
              useShelfStore.getState().resetToDefaults();
              clearDesignDraft();
            },
          },
        });
      }
    }

    setHasRestoredState(true);
  }, [hasRestoredState, isLoggedIn]);

  useEffect(() => {
    if (!hasRestoredState) return;
    return autosaveDesignDraft();
  }, [hasRestoredState]);

  // Catalog pages link here to start from one of their products:
  // /materijali with ?material=<id>, /rucke with ?rucka=<handle>&zavrsna=<finish>
  // (the store's handle and finish keys). Applied on top of the restored
  // design once the layout has put the catalogs in the store, which happens
  // after this page's first effects run.
  const storeMaterials = useShelfStore((s: ShelfState) => s.materials);
  const storeHandles = useShelfStore((s: ShelfState) => s.handles);
  const catalogParamsHandled = useRef(false);
  useEffect(() => {
    if (!hasRestoredState || catalogParamsHandled.current) return;
    if (storeMaterials.length === 0 || storeHandles.length === 0) return;
    catalogParamsHandled.current = true;
    const params = new URLSearchParams(window.location.search);
    const st = useShelfStore.getState();

    const materialId = Number(params.get("material"));
    const material = materialId
      ? storeMaterials.find((m) => m.id === materialId)
      : undefined;
    if (material) {
      if (material.categories.some(isBackMaterialCategory)) {
        st.setSelectedBackMaterialId(material.id);
      } else {
        if (material.categories.some(isKorpusMaterialCategory)) {
          st.setSelectedMaterialId(material.id);
        }
        if (material.categories.some(isFrontMaterialCategory)) {
          st.setSelectedFrontMaterialId(material.id);
        }
      }
      toast.success(`Izabran dekor ${cleanMaterialName(material.name)}`);
    }

    const handleKey = params.get("rucka");
    const handle = handleKey
      ? storeHandles.find((h) => (h.legacyId || String(h.id)) === handleKey)
      : undefined;
    if (handle && handleKey) {
      const finishKey = params.get("zavrsna");
      const finish =
        handle.finishes.find(
          (f) => (f.legacyId || String(f.id)) === finishKey,
        ) ?? handle.finishes[0];
      st.setGlobalHandle(handleKey);
      if (finish)
        st.setGlobalHandleFinish(finish.legacyId || String(finish.id));
      st.setActiveAccordionStep("item-5");
      toast.success(
        `Izabrano: ${modelForHandle(handle.id)?.name ?? handle.name}`,
      );
    }

    const catalogKeys = ["material", "rucka", "zavrsna"];
    if (catalogKeys.some((key) => params.has(key))) {
      for (const key of catalogKeys) params.delete(key);
      const rest = params.toString();
      window.history.replaceState({}, "", rest ? `/design?${rest}` : "/design");
    }
  }, [hasRestoredState, storeMaterials, storeHandles]);

  // The overlay lifts on the scene's first frame (onReady below); this only
  // guarantees it never hides a WebGL error screen.
  useEffect(() => {
    const timer = setTimeout(() => setIsSceneLoading(false), 5000);
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
      <Scene
        wardrobeRef={wardrobeRef!}
        onReady={() => setIsSceneLoading(false)}
      />
    </>
  );
}
