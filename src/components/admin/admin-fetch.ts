// Admin forms save through the old /api handlers with plain requests. This is
// the one place that sees every such save, so cached admin data can be marked
// out of date without each form knowing which lists show its record.

const listeners = new Set<() => void>();

export function onAdminWrite(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

/** `fetch` for admin forms: tells the cache when the server accepted a change. */
export async function adminFetch(input: RequestInfo | URL, init?: RequestInit) {
  const response = await fetch(input, init);
  const method = init?.method?.toUpperCase() ?? "GET";
  if (method !== "GET" && response.ok) {
    for (const listener of listeners) listener();
  }
  return response;
}
