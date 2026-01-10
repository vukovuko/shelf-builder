"use client";

import React from "react";
import { ConfiguratorControls } from "@/components/ConfiguratorControls";
import { ViewModeToggle } from "@/components/ViewModeToggle";

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
}

export function DesignLayoutClient({
  children,
  initialSession,
}: DesignLayoutClientProps) {
  const wardrobeRef = React.useRef<any>(null);
  const [drawerOpen, setDrawerOpen] = React.useState(false);
  useLockBodyScroll(drawerOpen);

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
        />
      </aside>

      {/* Mobile header */}
      <div className="md:hidden fixed top-0 inset-x-0 z-30 flex items-center justify-between h-14 px-4 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <button
          onClick={() => setDrawerOpen(true)}
          className="inline-flex items-center justify-center rounded-md border px-3 py-2 text-sm font-medium hover:bg-accent"
          aria-label="Open configurator menu"
        >
          Meni
        </button>
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
          />
          <div className="absolute inset-y-0 left-0 w-[85vw] max-w-xs bg-sidebar border-r border-sidebar-border p-4 overflow-y-auto flex flex-col">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold">Podešavanje</h2>
              <button
                onClick={() => setDrawerOpen(false)}
                className="inline-flex items-center justify-center rounded-md border px-2 py-1 text-sm hover:bg-accent"
                aria-label="Close menu"
              >
                Zatvori
              </button>
            </div>
            <div className="-mx-1 flex-1">
              <ConfiguratorControls
                wardrobeRef={wardrobeRef}
                initialSession={initialSession}
              />
            </div>
          </div>
        </div>
      )}

      <main className="flex-1 relative overflow-hidden h-screen pt-14 md:pt-0">
        <div className="absolute top-2 right-2 hidden md:block z-20">
          <ViewModeToggle />
        </div>
        {childrenWithProps}
      </main>
    </div>
  );
}
