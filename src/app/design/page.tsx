"use client";

import { useSearchParams } from "next/navigation";
import type React from "react";
import { Suspense, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { Scene } from "@/components/Scene";
import {
  applyWardrobeSnapshot,
  getWardrobeSnapshot,
} from "@/lib/serializeWardrobe";
import { useShelfStore, type ShelfState } from "@/lib/store";

const AUTOSAVE_KEY = "wardrobeAutoSave";
const AUTOSAVE_DEBOUNCE_MS = 1000;

// Module-level flag to coordinate between LoadFromUrl and AutoSave
// This prevents AutoSave from saving stale data while a URL load is in progress
let isLoadingFromUrl = false;

// Separate component for URL param handling - wrapped in Suspense
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
      isLoadingFromUrl = true;

      // Clear localStorage autosave when explicitly loading from URL
      // This prevents stale data from showing if the fetch fails
      localStorage.removeItem(AUTOSAVE_KEY);

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
          isLoadingFromUrl = false;
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
      } finally {
        isLoadingFromUrl = false;
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

// Auto-save wardrobe state to localStorage
function AutoSave() {
  const debounceRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    // Subscribe to store changes and auto-save
    const unsubscribe = useShelfStore.subscribe(() => {
      // Skip autosave while loading from URL to prevent race conditions
      if (isLoadingFromUrl) return;
      // Skip autosave in preview mode (locked wardrobe)
      if (useShelfStore.getState().isPreviewMode) return;

      // Debounce saves to avoid excessive writes
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
      debounceRef.current = setTimeout(() => {
        // Double-check loading flag and preview mode before saving
        if (isLoadingFromUrl) return;
        if (useShelfStore.getState().isPreviewMode) return;

        try {
          const snapshot = getWardrobeSnapshot();
          localStorage.setItem(AUTOSAVE_KEY, JSON.stringify(snapshot));
        } catch (e) {
          console.error("Failed to auto-save wardrobe state", e);
        }
      }, AUTOSAVE_DEBOUNCE_MS);
    });

    return () => {
      unsubscribe();
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, []);

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
  //           3. wardrobeAutoSave (page refresh)
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

    // Try auto-save (page refresh recovery)
    const autoSave = localStorage.getItem(AUTOSAVE_KEY);
    if (autoSave) {
      try {
        const state = JSON.parse(autoSave);
        if (state && typeof state === "object") {
          applyWardrobeSnapshot(state);
          // Don't show toast for auto-restore - it's seamless
        }
      } catch (_e) {
        localStorage.removeItem(AUTOSAVE_KEY);
      }
    }

    setHasRestoredState(true);
  }, [hasRestoredState, isLoggedIn]);

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
      {/* Auto-save wardrobe state */}
      <AutoSave />
      {/* Scene stays mounted and stable */}
      <Scene wardrobeRef={wardrobeRef!} />
    </>
  );
}
