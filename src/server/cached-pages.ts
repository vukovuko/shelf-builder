import { TODO_HOST } from "@/lib/todo/host";

const CACHED_PAGES = [
  /^\/materijali(\/[^/]+)?$/,
  /^\/rucke(\/[^/]+)?$/,
  /^\/sitemap\.xml$/,
  /^\/llms-full\.txt$/,
];

/**
 * Whether this request may be answered with a stored page. Only the catalog
 * pages, which are the same for everyone, and only for a visitor who is not
 * signed in. A query string is never cached: tracking parameters would each
 * store their own copy.
 */
export function isCachedPage(request: Request): boolean {
  if (request.method !== "GET") return false;
  const url = new URL(request.url);
  if (url.search !== "" || url.host === TODO_HOST) return false;
  if (!CACHED_PAGES.some((page) => page.test(url.pathname))) return false;
  return !(request.headers.get("cookie") ?? "").includes("session_token");
}
