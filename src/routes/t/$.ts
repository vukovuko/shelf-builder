import { createFileRoute } from "@tanstack/react-router";

// PostHog through our own domain, so ad blockers that block PostHog's hosts
// do not hide visits. The path must not be /ingest, /analytics, /tracking or
// /posthog: blockers match on those.
const ASSETS_ORIGIN = "https://eu-assets.i.posthog.com";
const INGEST_ORIGIN = "https://eu.i.posthog.com";

async function forward({ request }: { request: Request }) {
  const url = new URL(request.url);
  const path = url.pathname.replace(/^\/t\//, "");
  const origin = path.startsWith("static/") ? ASSETS_ORIGIN : INGEST_ORIGIN;

  const headers = new Headers(request.headers);
  // PostHog has no use for our session cookie.
  headers.delete("cookie");
  headers.delete("host");
  // PostHog places the visitor on the map by this address.
  const visitorIp = request.headers.get("cf-connecting-ip");
  if (visitorIp) headers.set("x-forwarded-for", visitorIp);

  const hasBody = request.method !== "GET" && request.method !== "HEAD";
  return fetch(`${origin}/${path}${url.search}`, {
    method: request.method,
    headers,
    body: hasBody ? await request.arrayBuffer() : undefined,
    redirect: "manual",
  });
}

export const Route = createFileRoute("/t/$")({
  server: {
    handlers: { GET: forward, POST: forward, OPTIONS: forward },
  },
});
