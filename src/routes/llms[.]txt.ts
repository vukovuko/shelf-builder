import { createFileRoute } from "@tanstack/react-router";
import { buildLlmsTxt } from "@/lib/llms";

export const Route = createFileRoute("/llms.txt")({
  server: {
    handlers: {
      GET: () =>
        new Response(buildLlmsTxt(), {
          headers: { "Content-Type": "text/markdown; charset=utf-8" },
        }),
    },
  },
});
