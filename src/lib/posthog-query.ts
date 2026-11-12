import "server-only";

/**
 * Runs a HogQL query against PostHog. Analytics are an extra on the pages
 * that show them: without the keys (a test build), or when PostHog does not
 * answer, the result is empty and the page still renders.
 */
export async function queryPostHog<T>(hogql: string): Promise<T[]> {
  const host = process.env.POSTHOG_HOST;
  const project = process.env.POSTHOG_PROJECT_ID;
  const key = process.env.POSTHOG_API_KEY;
  if (!host || !project || !key) return [];

  try {
    const res = await fetch(`${host}/api/projects/${project}/query`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ query: { kind: "HogQLQuery", query: hogql } }),
    });

    if (!res.ok) {
      console.error(`[PostHog] Query failed: ${res.status}`);
      return [];
    }

    const data = (await res.json()) as { results?: T[] };
    return data.results ?? [];
  } catch (error) {
    console.error("[PostHog] Query failed:", error);
    return [];
  }
}
