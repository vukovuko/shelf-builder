import { createFileRoute } from "@tanstack/react-router";
import { GET } from "@/app/todo-auth/route";
import { NextRequest } from "@/compat/next/server";

// Second half of the to-do board's login handoff; see lib/todo/host.
export const Route = createFileRoute("/todo-auth")({
  server: {
    handlers: { GET: ({ request }) => GET(new NextRequest(request)) },
  },
});
