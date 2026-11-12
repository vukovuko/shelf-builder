import { parseSearch } from "@/lib/search-params";

export interface RouterTarget {
  to: string;
  search?: Record<string, unknown>;
  hash?: string;
}

/**
 * Splits an in-app href into the parts the router navigates by. Returns null
 * for anything the router should not handle: other origins, mailto:, tel:,
 * and same-page "#anchor" links.
 */
export function parseHref(href: string): RouterTarget | null {
  if (!href.startsWith("/") || href.startsWith("//")) return null;
  const url = new URL(href, "http://app.local");
  // The router's own parser, so the address is written back as it was given.
  const search = parseSearch(url.search);
  return {
    to: url.pathname,
    search: Object.keys(search).length > 0 ? search : undefined,
    hash: url.hash ? url.hash.slice(1) : undefined,
  };
}
