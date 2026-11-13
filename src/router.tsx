import { QueryClient } from "@tanstack/react-query";
import { createRouter } from "@tanstack/react-router";
import { setupRouterSsrQueryIntegration } from "@tanstack/react-router-ssr-query";
import { parseSearch, stringifySearch } from "@/lib/search-params";
import { todoHostInput, todoHostOutput } from "@/lib/todo/host-rewrite";
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
    rewrite: { input: todoHostInput, output: todoHostOutput },
    scrollRestoration: true,
    defaultPreload: "intent",
    // Query owns freshness; the router must not keep its own copy of loader data.
    defaultPreloadStaleTime: 0,
    // Coming back to a page, the router would draw its remembered copy first
    // and run the loader behind it. A form that copies its record into state
    // (every admin detail page) would then start from old values. Waiting for
    // the loader costs nothing where it reads from the Query cache.
    defaultStaleReloadMode: "blocking",
    // Going from one record straight to another of the same kind (history)
    // keeps the page component, and with it the state a form copied from
    // the first record. A new component per record avoids saving one
    // record's values into another.
    defaultRemountDeps: ({ params }) => params,
  });

  setupRouterSsrQueryIntegration({ router, queryClient });

  return router;
}

declare module "@tanstack/react-router" {
  interface Register {
    router: ReturnType<typeof getRouter>;
  }
}
