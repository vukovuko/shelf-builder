import { useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { AccountClient } from "@/components/account/AccountClient";
import { accountSettingsQuery } from "@/server/account.functions";

export const Route = createFileRoute("/account/settings")({
  loader: ({ context }) =>
    context.user
      ? context.queryClient.ensureQueryData(accountSettingsQuery)
      : null,
  component: SettingsPage,
});

function SettingsPage() {
  const { data: user } = useSuspenseQuery(accountSettingsQuery);
  return user && <AccountClient user={user} />;
}
