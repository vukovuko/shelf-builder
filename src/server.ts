import handler, { createServerEntry } from "@tanstack/react-start/server-entry";
import { answerPrograms } from "@/server/agent-requests";
import { isCachedPage } from "@/server/cached-pages";
import { cachedCatalogData } from "@/server/edge-cache.server";

// The Worker's entry. Everything goes to TanStack Start as before; requests
// from programs that do not ask for HTML are looked after on the way
// (src/server/agent-requests.ts).
export default createServerEntry({
  fetch: (request, options) =>
    answerPrograms(
      request,
      (asked) => handler.fetch(asked, options),
      // Catalog pages are large (the materials list is half a megabyte of
      // HTML), so their Markdown is stored beside the page itself and
      // expires with it.
      (asked, make) => {
        if (!isCachedPage(asked)) return make();
        const { host, pathname } = new URL(asked.url);
        return cachedCatalogData(`markdown:${host}${pathname}`, make);
      },
    ),
});
