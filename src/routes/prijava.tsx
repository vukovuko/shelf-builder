import { createFileRoute, redirect } from "@tanstack/react-router";
import { SignInPanel } from "@/components/SignInPanel";
import { safeReturnTo } from "@/lib/return-to";
import { loadCurrentUser } from "@/server/session.functions";

export const Route = createFileRoute("/prijava")({
  validateSearch: (search: Record<string, unknown>) => ({
    return_to:
      typeof search.return_to === "string" ? search.return_to : undefined,
  }),
  beforeLoad: async ({ context, search }) => {
    const returnTo = safeReturnTo(search.return_to);
    // Already signed in (or just back from Google): go where they were
    // headed. That page checks their permissions itself.
    if (await loadCurrentUser(context.queryClient)) {
      throw redirect({ href: returnTo });
    }
    return { returnTo };
  },
  head: () => ({
    meta: [
      { title: "Prijava | Ormani po meri" },
      { name: "robots", content: "noindex" },
      { name: "googlebot", content: "noindex" },
    ],
  }),
  component: SignInPage,
});

function SignInPage() {
  const { returnTo } = Route.useRouteContext();
  return (
    <SignInPanel
      returnTo={returnTo}
      guestHint={returnTo.startsWith("/account")}
    />
  );
}
