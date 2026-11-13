import { useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { AccountClient } from "@/components/account/AccountClient";
import { accountSettingsQuery } from "@/server/account.functions";

export const Route = createFileRoute("/account/settings")({
  loader: ({ context }) =>
    // The form copies this into its fields, so it never starts from a
    // cached copy (checkout, for one, rewrites the address).
    context.user
      ? context.queryClient.fetchQuery({
          ...accountSettingsQuery,
          staleTime: 0,
        })
      : null,
  component: SettingsPage,
});

function SettingsPage() {
  const { data: user } = useSuspenseQuery(accountSettingsQuery);
  return user && <AccountClient user={user} />;
}
