import { createFileRoute } from "@tanstack/react-router";
import { buildRobotsTxt } from "@/lib/seo/robots";

export const Route = createFileRoute("/robots.txt")({
  server: {
    handlers: {
      GET: () =>
        new Response(buildRobotsTxt(), {
          headers: { "Content-Type": "text/plain; charset=utf-8" },
        }),
    },
  },
});
