"use client";

import { ConfiguratorControls } from "@/components/ConfiguratorControls";
import { ViewModeToggle } from "@/components/ViewModeToggle";
import React from "react";


export default function DesignLayout({ children }: { children: React.ReactNode }) {
  const wardrobeRef = React.useRef<any>(null);
  // Clone children and inject wardrobeRef as prop if possible
  const childrenWithProps = React.Children.map(children, child => {
    if (React.isValidElement(child)) {
      return React.cloneElement(child, { wardrobeRef });
    }
    return child;
  });
  return (
    <div className="flex min-h-screen bg-background text-foreground">
      <aside className="w-96 flex-col border-r border-sidebar-border bg-sidebar p-6">
        <h1 className="text-2xl font-bold">Your Wardrobe</h1>
        <p className="text-sm text-muted-foreground mb-6">
          Design your own wardrobe in just a few steps.
        </p>
        <ConfiguratorControls wardrobeRef={wardrobeRef} />
      </aside>
      <main className="flex-1 relative">
        <ViewModeToggle />
        {childrenWithProps}
      </main>
    </div>
  );
}
