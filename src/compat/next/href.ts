import { defaultParseSearch } from "@tanstack/react-router";

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
  // The router's own parser, so "?material=2305" is written back the same
  // way and not as a quoted string.
  const search = defaultParseSearch(url.search);
  return {
    to: url.pathname,
    search: Object.keys(search).length > 0 ? search : undefined,
    hash: url.hash ? url.hash.slice(1) : undefined,
  };
}
