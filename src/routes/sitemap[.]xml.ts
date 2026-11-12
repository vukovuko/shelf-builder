import { createFileRoute } from "@tanstack/react-router";
import { buildSitemapXml } from "@/server/sitemap.server";

export const Route = createFileRoute("/sitemap.xml")({
  server: {
    handlers: {
      GET: async () =>
        new Response(await buildSitemapXml(), {
          headers: { "Content-Type": "application/xml" },
        }),
    },
  },
});
