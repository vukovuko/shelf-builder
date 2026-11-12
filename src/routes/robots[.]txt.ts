import { createFileRoute } from "@tanstack/react-router";
import { buildRobotsTxt } from "@/lib/seo/robots";
import { TODO_HOST } from "@/lib/todo/host";

export const Route = createFileRoute("/robots.txt")({
  server: {
    handlers: {
      GET: ({ request }) =>
        new Response(
          // The to-do board's host tells every crawler to stay out.
          new URL(request.url).host === TODO_HOST
            ? "User-agent: *\nDisallow: /\n"
            : buildRobotsTxt(),
          { headers: { "Content-Type": "text/plain; charset=utf-8" } },
        ),
    },
  },
});
