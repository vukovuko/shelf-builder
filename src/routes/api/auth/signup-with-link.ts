import { createFileRoute } from "@tanstack/react-router";
import { POST } from "@/app/api/auth/signup-with-link/route";

// Registration is our own handler, not one of Better Auth's. It needs its own
// route file: everything else under /api/auth goes to Better Auth ($.ts),
// which answers 404 for an address it does not know.
export const Route = createFileRoute("/api/auth/signup-with-link")({
  server: { handlers: { POST: ({ request }) => POST(request) } },
});
