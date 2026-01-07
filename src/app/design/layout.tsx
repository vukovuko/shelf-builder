"use client";

import { ConfiguratorControls } from "@/components/ConfiguratorControls";
import { ViewModeToggle } from "@/components/ViewModeToggle";
import React from "react";

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


export default function DesignLayout({ children }: { children: React.ReactNode }) {
  const wardrobeRef = React.useRef<any>(null);
  const [drawerOpen, setDrawerOpen] = React.useState(false);
  useLockBodyScroll(drawerOpen);

  // Clone children and inject wardrobeRef as prop if possible
  const childrenWithProps = React.Children.map(children, child => {
    if (React.isValidElement(child)) {
      return React.cloneElement(child as any, { wardrobeRef });
    }
    return child;
  });

  return (
    <div className="flex min-h-screen bg-background text-foreground">
      {/* Desktop aside */}
      <aside className="hidden md:flex w-96 flex-col border-r border-sidebar-border bg-sidebar p-6">
        <h1 className="text-2xl font-bold">Your Wardrobe</h1>
        <p className="text-sm text-muted-foreground mb-6">
          Design your own wardrobe in just a few steps.
        </p>
        <ConfiguratorControls wardrobeRef={wardrobeRef} />
      </aside>

      {/* Mobile header */}
      <div className="md:hidden fixed top-0 inset-x-0 z-30 flex items-center justify-between h-14 px-4 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <button
          onClick={() => setDrawerOpen(true)}
          className="inline-flex items-center justify-center rounded-md border px-3 py-2 text-sm font-medium hover:bg-accent"
          aria-label="Open configurator menu"
        >
          Menu
        </button>
        <h1 className="text-base font-semibold">Wardrobe Designer</h1>
        <div className="w-12 flex justify-end">
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
            <div className="flex items-center justify-between mb-2">
              <h2 className="text-lg font-semibold">Configure</h2>
              <button
                onClick={() => setDrawerOpen(false)}
                className="inline-flex items-center justify-center rounded-md border px-2 py-1 text-sm hover:bg-accent"
                aria-label="Close menu"
              >
                Close
              </button>
            </div>
            <div className="text-xs text-muted-foreground mb-4">
              Design your own wardrobe in just a few steps.
            </div>
            <div className="-mx-1 flex-1">
              <ConfiguratorControls wardrobeRef={wardrobeRef} />
            </div>
          </div>
        </div>
      )}

      <main
        className="flex-1 relative md:ml-0 overflow-hidden"
        style={{
          // On mobile subtract fixed header height; on desktop full viewport
          height: 'calc(100vh - 3.5rem)',
        }}
      >
        <div className="absolute top-2 right-2 hidden md:block z-20">
          <ViewModeToggle />
        </div>
        {childrenWithProps}
      </main>
    </div>
  );
}
