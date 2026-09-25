// robots.txt of todo.ormanipomeri.com (next.config rewrites it here).
export const dynamic = "force-static";

export function GET() {
  return new Response("User-agent: *\nDisallow: /\n", {
    headers: { "Content-Type": "text/plain; charset=utf-8" },
  });
}
