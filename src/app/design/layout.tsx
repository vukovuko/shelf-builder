import { ConfiguratorControls } from "@/components/ConfiguratorControls";
import { ViewModeToggle } from "@/components/ViewModeToggle"; // Import the new component

export default function DesignLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen bg-background text-foreground">
      <aside className="w-96 flex-col border-r border-sidebar-border bg-sidebar p-6">
        <h1 className="text-2xl font-bold">Your Wardrobe</h1>
        <p className="text-sm text-muted-foreground mb-6">
          Design your own wardrobe in just a few steps.
        </p>
        <ConfiguratorControls />
      </aside>

      <main className="flex-1 relative">
        <ViewModeToggle />
        {children}
      </main>
    </div>
  );
}
