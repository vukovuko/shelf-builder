import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import {
  SidebarProvider,
  SidebarInset,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { UserSidebar } from "./UserSidebar";
import { ThemeToggle } from "@/components/ThemeToggle";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  // Redirect to home if not logged in
  if (!session) {
    redirect("/");
  }

  return (
    <SidebarProvider>
      <UserSidebar />
      <SidebarInset>
        <header className="flex h-14 items-center gap-4 border-b bg-background px-4">
          <SidebarTrigger />
          <div className="flex-1" />
          <ThemeToggle />
        </header>
        <main className="flex-1 p-6">{children}</main>
      </SidebarInset>
    </SidebarProvider>
  );
}
