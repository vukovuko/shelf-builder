export interface RouterTarget {
  to: string;
  search?: Record<string, string>;
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
  const search = Object.fromEntries(url.searchParams);
  return {
    to: url.pathname,
    search: Object.keys(search).length > 0 ? search : undefined,
    hash: url.hash ? url.hash.slice(1) : undefined,
  };
}
