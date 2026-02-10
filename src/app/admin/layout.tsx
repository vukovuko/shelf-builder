import { redirect } from "next/navigation";
import { getCurrentUser, isAdmin } from "@/lib/roles";
import {
  SidebarProvider,
  SidebarInset,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { AdminSidebar } from "./AdminSidebar";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getCurrentUser();

  // Not logged in
  if (!user) {
    redirect("/");
  }

  // Not admin
  if (!isAdmin(user.role)) {
    redirect("/");
  }

  return (
    <SidebarProvider>
      {/* Scoped icon stroke-width for lighter admin aesthetic */}
      <style>{`.admin-scope .lucide { stroke-width: 1.5; }`}</style>
      <div className="admin-scope contents">
        <AdminSidebar />
        <SidebarInset className="min-w-0">
          <header className="flex h-14 items-center gap-4 border-b bg-background px-4">
            <SidebarTrigger />
          </header>
          <main className="flex-1 p-4 sm:p-6 overflow-x-auto">
            <div className="max-w-6xl mx-auto">{children}</div>
          </main>
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
}
