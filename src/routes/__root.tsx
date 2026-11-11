import type { QueryClient } from "@tanstack/react-query";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import {
  createRootRouteWithContext,
  HeadContent,
  Scripts,
} from "@tanstack/react-router";
import { ThemeProvider } from "next-themes";
import type { ReactNode } from "react";
import ErrorPage from "@/app/error";
import appCss from "@/app/globals.css?url";
import NotFound from "@/app/not-found";
import { Toaster } from "@/components/ui/sonner";
import {
  jsonLd,
  SITE_URL,
  siteJsonLd,
  siteLinks,
  siteMeta,
} from "@/lib/seo/site";
import fontsCss from "@/styles/fonts.css?url";

interface RouterContext {
  queryClient: QueryClient;
}

/**
 * Chrome's page translation swaps text nodes for <font> elements behind
 * React's back; React then calls removeChild / insertBefore on nodes that have
 * moved and the whole page crashes (facebook/react#11538). Visitors whose
 * browser isn't in Serbian hit this on /design. Skipping the impossible DOM
 * call keeps the page alive; live numbers are marked translate="no" so they
 * keep updating.
 */
const TRANSLATION_GUARD = `(function(){
  if (typeof Node !== "function" || !Node.prototype) return;
  var removeChild = Node.prototype.removeChild;
  Node.prototype.removeChild = function (child) {
    if (child.parentNode !== this) return child;
    return removeChild.apply(this, arguments);
  };
  var insertBefore = Node.prototype.insertBefore;
  Node.prototype.insertBefore = function (node, reference) {
    if (reference && reference.parentNode !== this) return node;
    return insertBefore.apply(this, arguments);
  };
})();`;

export const Route = createRootRouteWithContext<RouterContext>()({
  head: ({ matches }) => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      ...siteMeta,
      // The workers.dev build is for the team only until the domain moves over.
      { name: "robots", content: "noindex, nofollow" },
    ],
    links: [
      { rel: "stylesheet", href: fontsCss },
      { rel: "stylesheet", href: appCss },
      ...siteLinks,
      {
        rel: "canonical",
        href: `${SITE_URL}${matches[matches.length - 1]?.pathname ?? "/"}`,
      },
    ],
    scripts: [
      // Runs before React so a page Chrome auto-translates can't crash it.
      { children: TRANSLATION_GUARD },
      jsonLd(siteJsonLd),
    ],
  }),
  shellComponent: RootDocument,
  notFoundComponent: NotFound,
  errorComponent: ({ error, reset }) => (
    <ErrorPage error={error as Error} reset={reset} />
  ),
});

function RootDocument({ children }: { children: ReactNode }) {
  return (
    // next-themes sets the theme class on <html> before React hydrates.
    <html lang="sr" suppressHydrationWarning>
      <head>
        <HeadContent />
      </head>
      <body className="antialiased">
        <ThemeProvider
          attribute="class"
          defaultTheme="light"
          enableSystem={false}
        >
          {children}
          <Toaster position="bottom-center" />
        </ThemeProvider>
        {import.meta.env.DEV && <ReactQueryDevtools />}
        <Scripts />
      </body>
    </html>
  );
}
