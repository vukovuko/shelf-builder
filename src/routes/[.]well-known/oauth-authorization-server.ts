import { createFileRoute } from "@tanstack/react-router";
import { GET } from "@/app/.well-known/oauth-authorization-server/route";

// OAuth metadata for AI assistants connecting to /api/mcp (RFC 8414).
export const Route = createFileRoute("/.well-known/oauth-authorization-server")(
  {
    server: { handlers: { GET: ({ request }) => GET(request) } },
  },
);
