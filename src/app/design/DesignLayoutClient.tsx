"use client";

import React, { useState, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, DoorOpen, DoorClosed } from "lucide-react";
import { toast } from "sonner";
import { ConfiguratorControls } from "@/components/ConfiguratorControls";
import { ViewModeToggle } from "@/components/ViewModeToggle";
import { UnsavedChangesDialog } from "@/components/UnsavedChangesDialog";
import { Button } from "@/components/ui/button";
import {
  useShelfStore,
  type Material,
  type Handle,
  type ShelfState,
} from "@/lib/store";
import { getWardrobeSnapshot } from "@/lib/serializeWardrobe";

// Helper to capture thumbnail from canvas
async function captureThumbnail(canvas: HTMLCanvasElement): Promise<string> {
  return new Promise((resolve) => {
    // Use lower quality for smaller file size
    const dataUrl = canvas.toDataURL("image/jpeg", 0.7);
    resolve(dataUrl);
  });
}

function useLockBodyScroll(locked: boolean) {
  React.useEffect(() => {
    if (!locked) return;
    const original = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = original;
    };
  }, [locked]);
}

interface DesignLayoutClientProps {
  children: React.ReactNode;
  initialSession: {
    user: {
      id: string;
      name: string;
      email: string;
      image?: string | null;
    };
  } | null;
  initialMaterials: Material[];
  initialHandles: Handle[];
  isAdmin?: boolean;
}

export function DesignLayoutClient({
  children,
  initialSession,
  initialMaterials,
  initialHandles,
  isAdmin = false,
}: DesignLayoutClientProps) {
  const wardrobeRef = React.useRef<any>(null);
  const [drawerOpen, setDrawerOpen] = React.useState(false);
  useLockBodyScroll(drawerOpen);

  // Set materials and handles in store on mount
  const setMaterials = useShelfStore((state: ShelfState) => state.setMaterials);
  const setHandles = useShelfStore((state: ShelfState) => state.setHandles);
  React.useEffect(() => {
    setMaterials(initialMaterials);
  }, [initialMaterials, setMaterials]);
  React.useEffect(() => {
    setHandles(initialHandles);
  }, [initialHandles, setHandles]);

  // Track order context for "back to order" button
  const fromOrderId = useShelfStore((state: ShelfState) => state.fromOrderId);
  const fromOrderNumber = useShelfStore(
    (state: ShelfState) => state.fromOrderNumber,
  );

  // Track wardrobe context for "back to wardrobe" button
  const fromWardrobeId = useShelfStore(
    (state: ShelfState) => state.fromWardrobeId,
  );
  const fromWardrobeName = useShelfStore(
    (state: ShelfState) => state.fromWardrobeName,
  );

  // Router for programmatic navigation
  const router = useRouter();

  // Unsaved changes dialog state
  const [showUnsavedDialog, setShowUnsavedDialog] = useState(false);
  const [pendingNavigation, setPendingNavigation] = useState<string | null>(
    null,
  );

  // Check if there are unsaved changes
  const hasUnsavedChanges = useCallback(() => {
    const lastSaved = useShelfStore.getState().lastSavedSnapshot;
    if (!lastSaved) return true; // Never saved = has changes
    const current = getWardrobeSnapshot();
    return JSON.stringify(current) !== JSON.stringify(lastSaved);
  }, []);

  // Handle back button click with unsaved changes check
  const handleBackClick = useCallback(
    (href: string) => {
      if (hasUnsavedChanges()) {
        setPendingNavigation(href);
        setShowUnsavedDialog(true);
      } else {
        router.push(href);
      }
    },
    [hasUnsavedChanges, router],
  );

  // Handle discard - navigate without saving
  const handleDiscard = useCallback(() => {
    setShowUnsavedDialog(false);
    if (pendingNavigation) {
      router.push(pendingNavigation);
    }
  }, [pendingNavigation, router]);

  // State for save in progress
  const [isSaving, setIsSaving] = useState(false);

  // Handle save and navigate - actually save the wardrobe then navigate
  const handleSaveAndNavigate = useCallback(async () => {
    const loadedWardrobeId = useShelfStore.getState().loadedWardrobeId;

    if (!loadedWardrobeId) {
      // No wardrobe loaded - can't save, just navigate
      toast.error("Nema učitanog ormana za čuvanje");
      setShowUnsavedDialog(false);
      if (pendingNavigation) {
        router.push(pendingNavigation);
      }
      return;
    }

    setIsSaving(true);

    try {
      const snapshot = getWardrobeSnapshot();
      if (!snapshot || typeof snapshot !== "object") {
        toast.error("Greška pri čuvanju ormana");
        setIsSaving(false);
        return;
      }

      // Capture thumbnail from canvas
      let thumbnail: string | null = null;
      const canvas = document.querySelector("canvas");
      if (canvas) {
        try {
          thumbnail = await captureThumbnail(canvas as HTMLCanvasElement);
        } catch (e) {
          console.error("Failed to capture thumbnail", e);
        }
      }

      // Get wardrobe name (use existing or generate)
      const wardrobeName =
        fromWardrobeName || fromOrderNumber
          ? `Orman #${fromOrderNumber}`
          : "Orman";

      // Save the wardrobe
      const res = await fetch(`/api/wardrobes/${loadedWardrobeId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: wardrobeName,
          data: snapshot,
          thumbnail,
        }),
      });

      if (!res.ok) {
        toast.error("Greška pri čuvanju ormana");
        setIsSaving(false);
        return;
      }

      // Mark as saved
      useShelfStore.getState().setLastSavedSnapshot(snapshot);

      toast.success("Orman je sačuvan");

      // Now navigate
      setShowUnsavedDialog(false);
      if (pendingNavigation) {
        router.push(pendingNavigation);
      }
    } catch (e) {
      console.error("Save failed", e);
      toast.error("Greška pri čuvanju ormana");
    } finally {
      setIsSaving(false);
    }
  }, [pendingNavigation, router, fromWardrobeName, fromOrderNumber]);

  // Door visibility toggle
  const doorGroups = useShelfStore((state: ShelfState) => state.doorGroups);
  const showDoors = useShelfStore((state: ShelfState) => state.showDoors);
  const setShowDoors = useShelfStore((state: ShelfState) => state.setShowDoors);
  const hasDoors = doorGroups.length > 0;

  // Clone children and inject wardrobeRef and isLoggedIn as props
  const childrenWithProps = React.Children.map(children, (child) => {
    if (React.isValidElement(child)) {
      return React.cloneElement(child as any, {
        wardrobeRef,
        isLoggedIn: !!initialSession,
      });
    }
    return child;
  });

  return (
    <div className="flex h-screen bg-background text-foreground overflow-hidden">
      {/* Desktop aside */}
      <aside className="hidden md:flex w-96 flex-col border-r border-sidebar-border bg-sidebar h-screen">
        <ConfiguratorControls
          wardrobeRef={wardrobeRef}
          initialSession={initialSession}
          materials={initialMaterials}
          isAdmin={isAdmin}
        />
      </aside>

      {/* Mobile header */}
      <div className="md:hidden fixed top-0 inset-x-0 z-30 flex items-center justify-between h-14 px-4 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="flex items-center gap-2">
          {fromOrderId && fromOrderNumber && (
            <Button
              variant="outline"
              size="sm"
              onClick={() =>
                handleBackClick(`/admin/orders/${fromOrderId}`)
              }
            >
              <ArrowLeft className="h-4 w-4" />
              <span className="sr-only">Nazad na #{fromOrderNumber}</span>
            </Button>
          )}
          {fromWardrobeId && fromWardrobeName && !fromOrderId && (
            <Button
              variant="outline"
              size="sm"
              onClick={() =>
                handleBackClick(`/admin/wardrobes/${fromWardrobeId}`)
              }
            >
              <ArrowLeft className="h-4 w-4" />
              <span className="sr-only">Nazad na {fromWardrobeName}</span>
            </Button>
          )}
          <button
            type="button"
            onClick={() => setDrawerOpen(true)}
            className="inline-flex items-center justify-center rounded-md border px-3 py-2 text-sm font-medium hover:bg-accent"
            aria-label="Open configurator menu"
          >
            Meni
          </button>
        </div>
        <div className="flex-1" />
        <div className="flex items-center gap-2 justify-end">
          {hasDoors && (
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setShowDoors(!showDoors)}
              title={showDoors ? "Sakrij vrata" : "Prikaži vrata"}
            >
              {showDoors ? (
                <DoorOpen className="h-4 w-4" />
              ) : (
                <DoorClosed className="h-4 w-4 opacity-50" />
              )}
            </Button>
          )}
          <ViewModeToggle />
        </div>
      </div>

      {/* Drawer overlay */}
      {drawerOpen && (
        <div className="md:hidden fixed inset-0 z-40">
          <div
            className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            onClick={() => setDrawerOpen(false)}
            onKeyDown={(e) => e.key === "Escape" && setDrawerOpen(false)}
          />
          <div className="absolute inset-y-0 left-0 w-[85vw] max-w-xs bg-sidebar border-r border-sidebar-border overflow-y-auto flex flex-col">
            <ConfiguratorControls
              wardrobeRef={wardrobeRef}
              initialSession={initialSession}
              materials={initialMaterials}
              isAdmin={isAdmin}
            />
          </div>
        </div>
      )}

      <main className="flex-1 relative overflow-hidden h-screen">
        {fromOrderId && fromOrderNumber && (
          <div className="absolute top-2 left-2 hidden md:block z-20">
            <Button
              variant="outline"
              size="sm"
              onClick={() =>
                handleBackClick(`/admin/orders/${fromOrderId}`)
              }
            >
              <ArrowLeft className="h-4 w-4 mr-1" />
              Nazad na #{fromOrderNumber}
            </Button>
          </div>
        )}
        {fromWardrobeId && fromWardrobeName && !fromOrderId && (
          <div className="absolute top-2 left-2 hidden md:block z-20">
            <Button
              variant="outline"
              size="sm"
              onClick={() =>
                handleBackClick(`/admin/wardrobes/${fromWardrobeId}`)
              }
            >
              <ArrowLeft className="h-4 w-4 mr-1" />
              Nazad na {fromWardrobeName}
            </Button>
          </div>
        )}
        <div className="absolute top-2 right-2 hidden md:flex items-center gap-2 z-20">
          {hasDoors && (
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setShowDoors(!showDoors)}
              title={showDoors ? "Sakrij vrata" : "Prikaži vrata"}
            >
              {showDoors ? (
                <DoorOpen className="h-4 w-4" />
              ) : (
                <DoorClosed className="h-4 w-4 opacity-50" />
              )}
            </Button>
          )}
          <ViewModeToggle />
        </div>
        {childrenWithProps}
      </main>

      {/* Unsaved changes confirmation dialog */}
      <UnsavedChangesDialog
        open={showUnsavedDialog}
        onOpenChange={setShowUnsavedDialog}
        onDiscard={handleDiscard}
        onSave={handleSaveAndNavigate}
        isSaving={isSaving}
      />
    </div>
  );
}
