import { useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import { onSessionChange } from "@/lib/session-events";

/**
 * Drops cached server data when someone signs in, signs out or changes their
 * profile: most of it depends on who is asking (the account pages, the
 * configurator's purchase prices for admins).
 */
export function SessionSync() {
  const queryClient = useQueryClient();

  useEffect(
    () =>
      onSessionChange(() => {
        // Forms that call router.refresh() after signing in have already
        // started this refetch; a second one would only repeat it.
        queryClient.invalidateQueries(undefined, { cancelRefetch: false });
      }),
    [queryClient],
  );

  return null;
}
