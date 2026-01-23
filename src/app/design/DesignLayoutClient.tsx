"use client";

import React from "react";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { ConfiguratorControls } from "@/components/ConfiguratorControls";
import { ViewModeToggle } from "@/components/ViewModeToggle";
import { Button } from "@/components/ui/button";
import { useShelfStore, type Material } from "@/lib/store";

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
  isAdmin?: boolean;
}

export function DesignLayoutClient({
  children,
  initialSession,
  initialMaterials,
  isAdmin = false,
}: DesignLayoutClientProps) {
  const wardrobeRef = React.useRef<any>(null);
  const [drawerOpen, setDrawerOpen] = React.useState(false);
  useLockBodyScroll(drawerOpen);

  // Set materials in store on mount
  const setMaterials = useShelfStore((state) => state.setMaterials);
  React.useEffect(() => {
    setMaterials(initialMaterials);
  }, [initialMaterials, setMaterials]);

  // Track order context for "back to order" button
  const fromOrderId = useShelfStore((state) => state.fromOrderId);
  const fromOrderNumber = useShelfStore((state) => state.fromOrderNumber);

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
            <Button variant="outline" size="sm" asChild>
              <Link href={`/admin/orders/${fromOrderId}`}>
                <ArrowLeft className="h-4 w-4" />
                <span className="sr-only">Nazad na #{fromOrderNumber}</span>
              </Link>
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
        <div className="flex justify-end">
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
            <Button variant="outline" size="sm" asChild>
              <Link href={`/admin/orders/${fromOrderId}`}>
                <ArrowLeft className="h-4 w-4 mr-1" />
                Nazad na #{fromOrderNumber}
              </Link>
            </Button>
          </div>
        )}
        <div className="absolute top-2 right-2 hidden md:block z-20">
          <ViewModeToggle />
        </div>
        {childrenWithProps}
      </main>
    </div>
  );
}
