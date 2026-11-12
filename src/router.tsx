import { QueryClient } from "@tanstack/react-query";
import { createRouter } from "@tanstack/react-router";
import { setupRouterSsrQueryIntegration } from "@tanstack/react-router-ssr-query";
import { parseSearch, stringifySearch } from "@/lib/search-params";
import { routeTree } from "./routeTree.gen";

export function getRouter() {
  const queryClient = new QueryClient({
    defaultOptions: {
      // Data rendered on the server is not fetched again the moment the page
      // hydrates; mutations invalidate what they change.
      queries: { staleTime: 30_000 },
    },
  });

  const router = createRouter({
    routeTree,
    context: { queryClient },
    parseSearch,
    stringifySearch,
    scrollRestoration: true,
    defaultPreload: "intent",
    // Query owns freshness; the router must not keep its own copy of loader data.
    defaultPreloadStaleTime: 0,
  });

  setupRouterSsrQueryIntegration({ router, queryClient });

  return router;
}

declare module "@tanstack/react-router" {
  interface Register {
    router: ReturnType<typeof getRouter>;
  }
}
