import { useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import { onAccountChange } from "@/lib/account-events";
import { onSessionChange } from "@/lib/session-events";

/**
 * Keeps cached server data honest about who is asking and what they just
 * changed elsewhere in the app.
 */
export function SessionSync() {
  const queryClient = useQueryClient();

  useEffect(
    () =>
      onSessionChange(() => {
        // Most cached data depends on who is asking (the account pages, the
        // configurator's purchase prices for admins), and its keys do not
        // carry the user. What is not on screen is thrown away, so the next
        // person in this tab never sees the previous one's copy; the rest is
        // refetched. Forms that call router.refresh() after signing in have
        // already started that refetch; a second one would only repeat it.
        queryClient.removeQueries({ type: "inactive" });
        queryClient.invalidateQueries(undefined, { cancelRefetch: false });
      }),
    [queryClient],
  );

  useEffect(
    () =>
      onAccountChange(() => {
        // Same rule for the account pages after a design was saved or an
        // order placed: an account page opened next must not start from the
        // copy from before (the settings form would even put the old
        // address back into its fields).
        queryClient.removeQueries({ queryKey: ["account"], type: "inactive" });
        queryClient.invalidateQueries({ queryKey: ["account"] });
      }),
    [queryClient],
  );

  return null;
}
