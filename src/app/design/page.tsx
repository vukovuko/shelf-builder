"use client";

import { Scene } from "@/components/Scene";
import { useSession } from "@/lib/auth-client";
import { useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { applyWardrobeSnapshot } from "@/lib/serializeWardrobe";
import { toast } from "sonner";

export default function DesignPage(props: any) {
  const { data: session } = useSession();
  const searchParams = useSearchParams();
  const loadId = searchParams.get('load');
  const [hasRestoredState, setHasRestoredState] = useState(false);
  const [hasLoadedFromUrl, setHasLoadedFromUrl] = useState(false);

  // State persistence: Restore pending work after login
  useEffect(() => {
    if (session && !hasRestoredState) {
      const pendingState = localStorage.getItem('pendingWardrobeState');
      if (pendingState) {
        try {
          const state = JSON.parse(pendingState);
          applyWardrobeSnapshot(state);
          localStorage.removeItem('pendingWardrobeState');
          toast.success('Welcome back! Your work has been restored.');
        } catch (e) {
          console.error('Failed to restore pending state', e);
        }
      }
      setHasRestoredState(true);
    }
  }, [session, hasRestoredState]);

  // Load wardrobe from URL query param
  useEffect(() => {
    async function loadWardrobe() {
      if (!loadId || hasLoadedFromUrl) return;

      try {
        const res = await fetch(`/api/wardrobes/${loadId}`);
        if (!res.ok) {
          toast.error('Failed to load wardrobe');
          return;
        }

        const wardrobe = await res.json();
        applyWardrobeSnapshot(wardrobe.data);
        toast.success(`Loaded: ${wardrobe.name}`);

        // Remove query param from URL (clean up)
        window.history.replaceState({}, '', '/design');
        setHasLoadedFromUrl(true);
      } catch (e) {
        console.error('Failed to load wardrobe', e);
        toast.error('Failed to load wardrobe');
      }
    }

    loadWardrobe();
  }, [loadId, hasLoadedFromUrl]);

  // wardrobeRef will be injected by layout
  return <Scene {...props} />;
}
