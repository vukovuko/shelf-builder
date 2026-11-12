import { env } from "cloudflare:workers";
import { isNotFound, isRedirect } from "@tanstack/react-router";
import {
  createCsrfMiddleware,
  createMiddleware,
  createStart,
} from "@tanstack/react-start";
import { runWithDb } from "@/db/db";
import { isCachedPage } from "@/server/cached-pages";
import { pageCache } from "@/server/edge-cache.server";
import { withSecurityHeaders } from "@/server/security-headers";

const dbScope = createMiddleware().server(({ next }) =>
  runWithDb(env.HYPERDRIVE.connectionString, () => next()),
);

const SITE_HOST = "ormanipomeri.com";

const securityHeaders = createMiddleware().server(async ({ next, request }) => {
  const url = new URL(request.url);
  // One address per page: www goes to the bare domain, as it always has.
  if (url.host === `www.${SITE_HOST}`) {
    url.host = SITE_HOST;
    return withSecurityHeaders(Response.redirect(url, 308));
  }

  const result = await next();
  const response = withSecurityHeaders(result.response);
  // Search engines index the site under its own domain only, not under a
  // workers.dev address or the to-do board's host.
  if (url.host !== SITE_HOST) {
    response.headers.set("X-Robots-Tag", "noindex, nofollow");
  }
  return { ...result, response };
});

// Catalog pages are answered from the cache when it has them.
const cachedPages = createMiddleware().server(async ({ next, request }) => {
  const cache = isCachedPage(request) ? await pageCache(request) : null;
  if (!cache) return next();
  if (cache.hit) return cache.hit;
  const result = await next();
  return { ...result, response: cache.keep(result.response) };
});

// What a server function throws travels to the browser, message included,
// and a failed query's message is its SQL. Only redirects and not-found
// answers are meant for the caller; anything else is logged here and replaced.
const hideServerErrors = createMiddleware({ type: "function" }).server(
  async ({ next }) => {
    try {
      return await next();
    } catch (error) {
      if (isRedirect(error) || isNotFound(error)) throw error;
      console.error(error);
      throw new Error("Server error");
    }
  },
);

export const startInstance = createStart(() => ({
  functionMiddleware: [hideServerErrors],
  requestMiddleware: [
    securityHeaders,
    cachedPages,
    // Start adds this by itself only when src/start.ts does not exist.
    createCsrfMiddleware({ filter: (ctx) => ctx.handlerType === "serverFn" }),
    dbScope,
  ],
}));
