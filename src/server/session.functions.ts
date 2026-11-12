import { type QueryClient, queryOptions } from "@tanstack/react-query";
import { createServerFn } from "@tanstack/react-start";
import { getRequestHeaders } from "@tanstack/react-start/server";
import { auth } from "@/lib/auth";

/** Who is signed in, or null. Only what pages show: name and email. */
const getCurrentUser = createServerFn({ method: "GET" }).handler(async () => {
  const session = await auth.api.getSession({ headers: getRequestHeaders() });
  if (!session?.user) return null;
  const { id, name, email } = session.user;
  return { id, name, email };
});

export const currentUserQuery = queryOptions({
  queryKey: ["session", "user"],
  queryFn: () => getCurrentUser(),
  staleTime: 60_000,
});

/**
 * Who is signed in, for a route that decides what to show by it. A cached
 * "nobody" is never reused: the visitor may have signed in a moment ago.
 */
export function loadCurrentUser(queryClient: QueryClient) {
  const cached = queryClient.getQueryData(currentUserQuery.queryKey);
  return queryClient.fetchQuery(
    cached ? currentUserQuery : { ...currentUserQuery, staleTime: 0 },
  );
}
