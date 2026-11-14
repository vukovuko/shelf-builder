import { createFileRoute } from "@tanstack/react-router";
import { buildLlmsFullTxt } from "@/lib/llms";
import { loadPriceGuide } from "@/server/price-guide.server";

export const Route = createFileRoute("/llms-full.txt")({
  server: {
    handlers: {
      GET: async () =>
        new Response(buildLlmsFullTxt(await loadPriceGuide()), {
          headers: { "Content-Type": "text/markdown; charset=utf-8" },
        }),
    },
  },
});
