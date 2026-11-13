import { describe, expect, it, vi } from "vitest";
import { answerPrograms } from "../agent-requests";
import { pageToMarkdown } from "../markdown-page";

const PAGE = `<!doctype html><html><head>
<title>Ormani po meri | Cene &amp; modeli</title>
<meta name="description" content="Plakari &quot;po meri&quot;: izrada i dostava">
</head><body>
<header><nav><a href="/">Početna</a></nav></header>
<main><h1>Materijali</h1><p>Više od <strong>500</strong> dekora.</p>
<a href="/materijali/hrast">Hrast</a><script>window.x = 1</script>
<button type="button">Koliko košta dostava?</button></main>
<footer>Kontakt</footer>
<script type="application/ld+json">{"@type":"FAQPage","name":"Dostava je besplatna"}</script>
</body></html>`;

/** Start's page renderer: only a browser-like Accept header gets the page. */
function renderer(html = PAGE, status = 200) {
  return vi.fn(async (request: Request) => {
    const accept = request.headers.get("Accept") ?? "*/*";
    if (!/(^|,)\s*(\*\/\*|text\/html)/.test(accept)) {
      return Response.json({ error: "Only HTML requests" }, { status: 406 });
    }
    return new Response(html, {
      status,
      headers: { "content-type": "text/html; charset=utf-8" },
    });
  });
}

const get = (accept?: string, method = "GET") =>
  new Request("https://ormanipomeri.com/materijali", {
    method,
    headers: accept ? { Accept: accept } : {},
  });

describe("pageToMarkdown", () => {
  const markdown = pageToMarkdown(
    PAGE,
    "https://ormanipomeri.com/materijali?x=1",
  );

  it("starts with the title, description and address", () => {
    expect(markdown).toContain('title: "Ormani po meri | Cene & modeli"');
    expect(markdown).toContain(
      'description: "Plakari \\"po meri\\": izrada i dostava"',
    );
    expect(markdown).toContain('url: "https://ormanipomeri.com/materijali"');
  });

  it("keeps the content and drops navigation, footer and scripts", () => {
    expect(markdown).toContain("# Materijali");
    expect(markdown).toContain("**500**");
    expect(markdown).not.toContain("Početna");
    expect(markdown).not.toContain("Kontakt");
    expect(markdown).not.toContain("window.x");
  });

  it("keeps what is only in a button label or in the structured data", () => {
    expect(markdown).toContain("Koliko košta dostava?");
    expect(markdown).toContain(
      '```json\n{"@type":"FAQPage","name":"Dostava je besplatna"}\n```',
    );
  });

  it("makes links work outside the page", () => {
    expect(markdown).toContain(
      "[Hrast](https://ormanipomeri.com/materijali/hrast)",
    );
  });
});

describe("answerPrograms", () => {
  it("leaves a browser's page as it is, with the discovery links", async () => {
    const render = renderer();
    const response = await answerPrograms(get("text/html,*/*;q=0.8"), render);
    expect(render).toHaveBeenCalledTimes(1);
    expect(response.headers.get("content-type")).toContain("text/html");
    expect(await response.text()).toBe(PAGE);
    expect(response.headers.get("link")).toContain('rel="describedby"');
    expect(response.headers.get("vary")).toContain("Accept");
  });

  it("answers a request for Markdown with Markdown", async () => {
    const response = await answerPrograms(get("text/markdown"), renderer());
    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toBe(
      "text/markdown; charset=utf-8",
    );
    expect(response.headers.get("content-signal")).toContain("ai-input=yes");
    expect(Number(response.headers.get("x-markdown-tokens"))).toBeGreaterThan(
      0,
    );
    expect(await response.text()).toContain("# Materijali");
  });

  it("prefers Markdown when both are acceptable", async () => {
    const response = await answerPrograms(
      get("text/markdown, text/html;q=0.9"),
      renderer(),
    );
    expect(response.headers.get("content-type")).toContain("text/markdown");
  });

  it("gives the page instead of 406 to a program asking for JSON", async () => {
    const response = await answerPrograms(get("application/json"), renderer());
    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toContain("text/html");
  });

  it("keeps a missing page missing", async () => {
    const response = await answerPrograms(
      get("text/markdown"),
      renderer("<html><body>Nema</body></html>", 404),
    );
    expect(response.status).toBe(404);
    expect(response.headers.get("content-type")).toContain("text/html");
  });

  it("does not touch answers that are not pages", async () => {
    const json = vi.fn(async () => Response.json({ ok: true }));
    const response = await answerPrograms(get("text/markdown"), json);
    expect(await response.json()).toEqual({ ok: true });
    expect(response.headers.get("link")).toBeNull();
  });

  it("does not touch writes", async () => {
    const render = vi.fn(async () => Response.json({}, { status: 406 }));
    const response = await answerPrograms(get("text/markdown", "POST"), render);
    expect(render).toHaveBeenCalledTimes(1);
    expect(response.status).toBe(406);
  });

  it("uses a stored copy of the Markdown when one is offered", async () => {
    const response = await answerPrograms(
      get("text/markdown"),
      renderer(),
      async () => "stored",
    );
    expect(await response.text()).toBe("stored");
  });
});
