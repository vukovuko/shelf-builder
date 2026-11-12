import { createFileRoute } from "@tanstack/react-router";
import { buildLlmsFullTxt } from "@/lib/llms";

export const Route = createFileRoute("/llms-full.txt")({
  server: {
    handlers: {
      GET: () =>
        new Response(buildLlmsFullTxt(), {
          headers: { "Content-Type": "text/markdown; charset=utf-8" },
        }),
    },
  },
});
