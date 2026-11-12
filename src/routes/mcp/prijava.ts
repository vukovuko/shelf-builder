import { createFileRoute } from "@tanstack/react-router";
import { GET } from "@/app/mcp/prijava/route";

// Sign-in step of the AI-assistant OAuth flow; see the handler.
export const Route = createFileRoute("/mcp/prijava")({
  server: { handlers: { GET: ({ request }) => GET(request) } },
});
