import "server-only";

export async function queryPostHog<T>(hogql: string): Promise<T[]> {
  const res = await fetch(
    `${process.env.POSTHOG_HOST}/api/projects/${process.env.POSTHOG_PROJECT_ID}/query`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.POSTHOG_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ query: { kind: "HogQLQuery", query: hogql } }),
      next: { revalidate: 300 },
    },
  );

  if (!res.ok) {
    console.error(`[PostHog] Query failed: ${res.status}`);
    return [];
  }

  const data = await res.json();
  return data.results ?? [];
}
