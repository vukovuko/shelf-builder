import { createFileRoute } from "@tanstack/react-router";
import { buildLlmsTxt } from "@/lib/llms";
import { loadPriceGuide } from "@/server/price-guide.server";

export const Route = createFileRoute("/llms.txt")({
  server: {
    handlers: {
      GET: async () =>
        new Response(buildLlmsTxt(await loadPriceGuide()), {
          headers: { "Content-Type": "text/markdown; charset=utf-8" },
        }),
    },
  },
});
