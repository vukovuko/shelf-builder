import { createFileRoute } from "@tanstack/react-router";
import { NextRequest } from "@/compat/next/server";

// Serves the API handlers still written for Next.js (src/app/api/**/route.ts)
// without changing them, so they stay identical to the ones running in
// production on `main`. A handler leaves this bridge when its feature is
// rewritten as a server function: delete its route.ts and it is gone here.

const METHODS = ["GET", "POST", "PUT", "PATCH", "DELETE"] as const;
type Method = (typeof METHODS)[number];

type Handler = (
  request: Request,
  context: { params: Promise<Record<string, string>> },
) => Response | Promise<Response>;

type RouteModule = Partial<Record<Method, Handler>>;

interface LegacyRoute {
  pattern: RegExp;
  /** Dynamic segments in the path; fewer means a more specific route. */
  dynamic: number;
  load: () => Promise<RouteModule>;
}

const modules = import.meta.glob<RouteModule>("/src/app/api/**/route.ts");

// "admin/handles/[id]/finishes/[finishId]" → /^admin\/handles\/(?<id>[^/]+)\/…$/
const routes: LegacyRoute[] = Object.entries(modules)
  .map(([file, load]) => {
    const segments = file
      .replace(/^\/src\/app\/api\//, "")
      .replace(/\/?route\.ts$/, "")
      .split("/")
      .filter(Boolean);
    const source = segments
      .map((segment) => {
        const rest = segment.match(/^\[\.\.\.(\w+)\]$/);
        if (rest) return `(?<${rest[1]}>.+)`;
        const param = segment.match(/^\[(\w+)\]$/);
        if (param) return `(?<${param[1]}>[^/]+)`;
        return segment.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      })
      .join("/");
    return {
      pattern: new RegExp(`^${source}$`),
      dynamic: segments.filter((segment) => segment.startsWith("[")).length,
      load,
    };
  })
  // "users/role" must win over "users/[id]", as it does in Next.
  .sort((a, b) => a.dynamic - b.dynamic);

async function dispatch({
  request,
  params,
}: {
  request: Request;
  params: { _splat?: string };
}): Promise<Response> {
  const path = (params._splat ?? "").replace(/\/$/, "");
  for (const route of routes) {
    const match = route.pattern.exec(path);
    if (!match) continue;
    const handler = (await route.load())[request.method as Method];
    if (!handler) return new Response(null, { status: 405 });
    const named = Object.fromEntries(
      Object.entries(match.groups ?? {}).map(([name, value]) => [
        name,
        decodeURIComponent(value),
      ]),
    );
    return handler(new NextRequest(request), {
      params: Promise.resolve(named),
    });
  }
  return Response.json({ error: "Not found" }, { status: 404 });
}

export const Route = createFileRoute("/api/$")({
  server: {
    handlers: Object.fromEntries(
      METHODS.map((method) => [method, dispatch]),
    ) as Record<Method, typeof dispatch>,
  },
});
