import { createFileRoute } from "@tanstack/react-router";
import {
  GET,
  OPTIONS,
} from "@/app/.well-known/oauth-protected-resource/[[...path]]/route";

// RFC 9728 metadata for /api/mcp. Claude asks for it with the MCP path
// appended (/.well-known/oauth-protected-resource/api/mcp), others without.
export const Route = createFileRoute("/.well-known/oauth-protected-resource/$")(
  {
    server: {
      handlers: {
        GET: ({ request }) => GET(request),
        OPTIONS: () => OPTIONS(),
      },
    },
  },
);
