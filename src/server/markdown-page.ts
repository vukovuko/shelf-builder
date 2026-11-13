import { NodeHtmlMarkdown } from "node-html-markdown";

// A page as Markdown, for programs that ask for it (AI agents send
// `Accept: text/markdown`). The layout follows Cloudflare's "Markdown for
// Agents", which does this at the edge on paid plans: front matter from the
// page's meta tags, then the content without navigation, footer and scripts.

const converter = new NodeHtmlMarkdown({
  ignore: [
    "script",
    "style",
    "svg",
    "noscript",
    "template",
    "nav",
    "footer",
    "form",
    "iframe",
  ],
  keepDataImages: false,
});

const ENTITIES: Record<string, string> = {
  "&amp;": "&",
  "&lt;": "<",
  "&gt;": ">",
  "&quot;": '"',
  "&#39;": "'",
  "&#x27;": "'",
};

const decode = (text: string) =>
  text.replace(/&(amp|lt|gt|quot|#39|#x27);/g, (entity) => ENTITIES[entity]);

function metaContent(html: string, name: string): string | null {
  const tag = new RegExp(`<meta[^>]*\\bname="${name}"[^>]*>`, "i").exec(html);
  const content = tag && /\bcontent="([^"]*)"/i.exec(tag[0]);
  return content ? decode(content[1]).trim() : null;
}

/** The part of the document that is the page itself, not its chrome. */
function contentOf(html: string): string {
  const start = html.search(/<main[\s>]/i);
  const end = html.toLowerCase().lastIndexOf("</main>");
  if (start !== -1 && end > start) return html.slice(start, end + 7);
  const body = /<body[^>]*>([\s\S]*)<\/body>/i.exec(html);
  return body ? body[1] : html;
}

// The page's structured data. Some content exists only there: the answers on
// the FAQ page are folded away in the HTML but complete in its JSON-LD.
const STRUCTURED_DATA_LIMIT = 200_000;

function structuredData(html: string): string[] {
  const blocks: string[] = [];
  const script =
    /<script[^>]*type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/gi;
  let size = 0;
  for (const [, json] of html.matchAll(script)) {
    size += json.length;
    if (size > STRUCTURED_DATA_LIMIT) break;
    blocks.push(`\`\`\`json\n${json.trim()}\n\`\`\``);
  }
  return blocks;
}

// One line, quoted, so a colon or a quote in a title cannot break the YAML.
const yaml = (value: string) => JSON.stringify(value.replace(/\s+/g, " "));

export function pageToMarkdown(html: string, pageUrl: string): string {
  const url = new URL(pageUrl);
  const title = /<title[^>]*>([\s\S]*?)<\/title>/i.exec(html);
  const description = metaContent(html, "description");

  const front = [
    title && `title: ${yaml(decode(title[1]).trim())}`,
    description && `description: ${yaml(description)}`,
    `url: ${yaml(url.origin + url.pathname)}`,
  ].filter(Boolean);

  const body = converter
    .translate(contentOf(html))
    // An agent has only this text, so links must work without the page.
    .replace(/\]\(\/(?!\/)/g, `](${url.origin}/`)
    .trim();

  const parts = [body, ...structuredData(html)].filter(Boolean);
  return `---\n${front.join("\n")}\n---\n\n${parts.join("\n\n")}\n`;
}
