import { useQueryClient } from "@tanstack/react-query";
import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { Suspense, useEffect, useState } from "react";
import { AdminSidebar } from "@/components/admin/AdminSidebar";
import { invalidateAdminData } from "@/components/admin/admin-cache";
import { onAdminWrite } from "@/components/admin/admin-fetch";
import { TopBarSlot } from "@/components/admin/page-chrome";
import { ThemeToggle } from "@/components/ThemeToggle";
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { signInUrl } from "@/lib/return-to";
import { NOINDEX } from "@/lib/seo/site";
import { freshAdminAccess } from "@/server/admin/admin.functions";

export const Route = createFileRoute("/admin")({
  // The admin is an app behind a login. Nothing of it is drawn on the server,
  // and each page imports its component in the browser only, which keeps the
  // tables, charts and 3D view out of the Worker.
  ssr: false,
  beforeLoad: async ({ context, location }) => {
    // The data functions check the role again themselves.
    const access = await freshAdminAccess(context.queryClient);
    // Signed out: sign in, then come back to this page.
    if (access === "signed-out") {
      throw redirect({ href: signInUrl(location.href) });
    }
    // Signed in without the admin role: home, as if the page didn't exist.
    if (access === "forbidden") throw redirect({ to: "/" });
  },
  head: () => ({ meta: NOINDEX }),
  pendingComponent: AdminPending,
  component: AdminLayout,
});

function AdminPending() {
  return (
    <div className="flex min-h-[50svh] items-center justify-center">
      <div
        aria-label="Učitavanje"
        className="size-8 animate-spin rounded-full border-4 border-primary border-t-transparent"
        role="status"
      />
    </div>
  );
}

function AdminLayout() {
  const queryClient = useQueryClient();
  const [topBarSlot, setTopBarSlot] = useState<HTMLElement | null>(null);

  // A form saved something (adminFetch).
  useEffect(
    () => onAdminWrite(() => void invalidateAdminData(queryClient)),
    [queryClient],
  );

  return (
    <SidebarProvider>
      {/* Scoped icon stroke-width for lighter admin aesthetic */}
      <style>{`.admin-scope .lucide { stroke-width: 1.5; }`}</style>
      <div className="admin-scope contents">
        <AdminSidebar />
        <SidebarInset className="min-w-0">
          {/* Stays on screen while the page scrolls: a record page puts its
              save button here (SaveBar), so it is always in the same place. */}
          <header className="sticky top-0 z-30 flex h-14 items-center gap-3 border-b bg-background px-4">
            <SidebarTrigger />
            <div className="flex-1" />
            <div ref={setTopBarSlot} className="flex items-center gap-3" />
            <ThemeToggle />
          </header>
          {/* A page marked .admin-full-bleed (the to-do board) fills the
              whole area right of the sidebar instead of the centered column. */}
          <main className="flex-1 overflow-x-auto p-4 has-[.admin-full-bleed]:p-0 sm:p-6">
            <div className="mx-auto max-w-6xl has-[.admin-full-bleed]:max-w-none">
              <TopBarSlot value={topBarSlot}>
                <Suspense fallback={<AdminPending />}>
                  <Outlet />
                </Suspense>
              </TopBarSlot>
            </div>
          </main>
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
}
