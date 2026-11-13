import { pageToMarkdown } from "./markdown-page";

// Programs read the site too: AI agents, link previewers, HTTP libraries.
// Two things here are for them, and neither changes what a browser gets.
//
// 1. The page renderer answers 406 unless the Accept header names text/html
//    or */*. A program asking for text/markdown or application/json got an
//    error instead of the page. It now gets the page: as Markdown when it
//    asked for Markdown, otherwise as the HTML a browser would get.
// 2. Pages carry Link headers that point at the machine-readable entrances
//    (RFC 8288), so an agent that lands on any page finds them.

type Render = (request: Request) => Response | Promise<Response>;

/** How the Markdown of a page is made; injected so stored copies can be used. */
export type MarkdownOf = (
  request: Request,
  make: () => Promise<string>,
) => Promise<string>;

const LINKS = [
  '</llms.txt>; rel="describedby"; type="text/markdown"',
  '</sitemap.xml>; rel="sitemap"; type="application/xml"',
].join(", ");

// The same signals as robots.txt (src/lib/seo/robots.ts).
export const CONTENT_SIGNAL = "ai-train=yes, search=yes, ai-input=yes";

// Above this the conversion costs more CPU than a request on the free
// Workers plan may use; the page is sent as HTML instead.
const MARKDOWN_LIMIT = 2_000_000;

const wantsMarkdown = (accept: string) =>
  /(^|,)\s*text\/markdown\s*(;|,|$)/i.test(accept);

const isHtml = (response: Response) =>
  (response.headers.get("content-type") ?? "").includes("text/html");

/** The renderer's own refusal, not a 406 some route chose to send. */
const refusedByRenderer = (response: Response) =>
  response.status === 406 &&
  (response.headers.get("content-type") ?? "").includes("application/json");

function asBrowser(request: Request): Request {
  const headers = new Headers(request.headers);
  headers.set("Accept", "text/html");
  return new Request(request, { headers });
}

function withAgentHeaders(response: Response): Response {
  const marked = new Response(response.body, response);
  marked.headers.append("Link", LINKS);
  // The same address has two representations now.
  marked.headers.append("Vary", "Accept");
  return marked;
}

export async function answerPrograms(
  request: Request,
  render: Render,
  markdownOf: MarkdownOf = (_request, make) => make(),
): Promise<Response> {
  if (request.method !== "GET" && request.method !== "HEAD") {
    return render(request);
  }

  let response = await render(request);
  if (refusedByRenderer(response)) {
    response = await render(asBrowser(request));
  }
  if (!isHtml(response)) return response;
  if (response.status !== 200) return withAgentHeaders(response);

  const accept = request.headers.get("Accept") ?? "";
  if (request.method === "HEAD" || !wantsMarkdown(accept)) {
    return withAgentHeaders(response);
  }

  const length = Number(response.headers.get("content-length") ?? 0);
  if (length > MARKDOWN_LIMIT) return withAgentHeaders(response);

  const markdown = await markdownOf(request, async () =>
    pageToMarkdown(await response.clone().text(), request.url),
  );

  const headers = new Headers(response.headers);
  // They describe the HTML body, not this one.
  for (const name of ["content-length", "content-encoding", "etag"]) {
    headers.delete(name);
  }
  headers.set("Content-Type", "text/markdown; charset=utf-8");
  headers.set("Content-Signal", CONTENT_SIGNAL);
  // A rough count (about four characters per token) so an agent can budget.
  headers.set("x-markdown-tokens", String(Math.ceil(markdown.length / 4)));
  return withAgentHeaders(new Response(markdown, { status: 200, headers }));
}
