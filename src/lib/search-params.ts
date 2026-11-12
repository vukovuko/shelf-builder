// Search params are plain text in the address, as on the Next.js site:
// `?search=1035`, not the router's default JSON (`?search=%221035%22`).
// Shared components read and build query strings themselves with
// URLSearchParams, so the router has to agree with them.

export function parseSearch(
  searchStr: string,
): Record<string, string | string[]> {
  const search: Record<string, string | string[]> = {};
  for (const [key, value] of new URLSearchParams(searchStr)) {
    const seen = search[key];
    if (seen === undefined) search[key] = value;
    else if (Array.isArray(seen)) seen.push(value);
    else search[key] = [seen, value];
  }
  return search;
}

export function stringifySearch(search: Record<string, unknown>): string {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(search)) {
    for (const item of Array.isArray(value) ? value : [value]) {
      if (item === undefined || item === null || item === "") continue;
      params.append(
        key,
        typeof item === "object" ? JSON.stringify(item) : String(item),
      );
    }
  }
  const query = params.toString();
  return query ? `?${query}` : "";
}
