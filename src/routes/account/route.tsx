import { useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute, Outlet } from "@tanstack/react-router";
import { UserSidebar } from "@/components/account/UserSidebar";
import { SignInPanel } from "@/components/SignInPanel";
import { ThemeToggle } from "@/components/ThemeToggle";
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { currentUserQuery, loadCurrentUser } from "@/server/session.functions";

export const Route = createFileRoute("/account")({
  // Child routes read `user` to skip loading data nobody is signed in for.
  beforeLoad: async ({ context }) => ({
    user: await loadCurrentUser(context.queryClient),
  }),
  component: AccountLayout,
});

function AccountLayout() {
  const { data: user } = useSuspenseQuery(currentUserQuery);

  // No redirect: a link from an order email lands here, and after signing in
  // the same address shows the order.
  if (!user) return <SignInPanel guestHint />;

  return (
    <SidebarProvider>
      <UserSidebar />
      <SidebarInset>
        <header className="flex h-14 items-center gap-4 border-b bg-background px-4">
          <SidebarTrigger />
          <div className="flex-1" />
          <ThemeToggle />
        </header>
        <main className="flex-1 p-6">
          <Outlet />
        </main>
      </SidebarInset>
    </SidebarProvider>
  );
}
