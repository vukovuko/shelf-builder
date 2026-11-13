import { INDEXABLE, SITE_URL } from "@/lib/seo/site";

const PRIVATE = [
  "/api/",
  "/account/",
  "/admin/",
  "/prijava",
  "/todo-board",
  "/todo-auth",
];

// Search engines and AI assistants alike. Being read by AI is how the site
// gets named in ChatGPT, Claude, Gemini and Perplexity answers:
// Google-Extended also covers Gemini quoting the site live ("grounding"),
// not only training.
const AI_AGENTS = [
  "GPTBot", // OpenAI: training
  "OAI-SearchBot", // OpenAI: ChatGPT search results
  "ChatGPT-User", // OpenAI: pages fetched for a user's question
  "ClaudeBot", // Anthropic: training
  "Claude-SearchBot", // Anthropic: Claude search results
  "Claude-User", // Anthropic: pages fetched for a user's question
  "Google-Extended", // Gemini: training and live grounding
  "Applebot-Extended", // Apple Intelligence
  "PerplexityBot", // Perplexity search results
  "Perplexity-User", // Perplexity: pages fetched for a user's question
  "Meta-ExternalAgent", // Meta AI
  "CCBot", // Common Crawl, which many AI models learn from
];

// Bulk image and data harvesters: no visibility in return.
const HARVESTERS = ["img2dataset", "ImagesiftBot", "Diffbot", "Omgilibot"];

// What the content may be used for once it has been read
// (contentsignals.org). Yes to all three, for the same reason the AI crawlers
// above are let in: a shop wants to be found, quoted and known. The Markdown
// pages send the same line as a header (src/server/agent-requests.ts).
const CONTENT_SIGNAL = "Content-Signal: ai-train=yes, search=yes, ai-input=yes";

// The wording of the Content Signals Policy, which gives the line its meaning.
const CONTENT_SIGNALS_POLICY = `# As a condition of accessing this website, you agree to abide by the
# following content signals:
# (a) If a content-signal = yes, you may collect content for the
#     corresponding use.
# (b) If a content-signal = no, you may not collect content for the
#     corresponding use.
# (c) If the website operator does not include a content signal for a
#     corresponding use, the website operator neither grants nor restricts
#     permission via content signal with respect to the corresponding use.
# The content signals and their meanings are:
# search: building a search index and providing search results (e.g.,
#   returning hyperlinks and short excerpts from your website's contents).
#   Search does not include providing AI-generated search summaries.
# ai-input: inputting content into one or more AI models (e.g., retrieval
#   augmented generation, grounding, or other real-time taking of content
#   for generative AI search answers).
# ai-train: training or fine-tuning AI models.`;

function group(agents: string[], lines: string[]): string {
  return [...agents.map((agent) => `User-Agent: ${agent}`), ...lines].join(
    "\n",
  );
}

export function buildRobotsTxt(): string {
  // A build that search engines must not index (workers.dev) closes the door.
  if (!INDEXABLE) return "User-Agent: *\nDisallow: /\n";

  const open = [
    CONTENT_SIGNAL,
    "Allow: /",
    ...PRIVATE.map((path) => `Disallow: ${path}`),
  ];
  return `${[
    CONTENT_SIGNALS_POLICY,
    group(["*"], open),
    group(AI_AGENTS, open),
    group(HARVESTERS, ["Disallow: /"]),
    `Sitemap: ${SITE_URL}/sitemap.xml`,
  ].join("\n\n")}\n`;
}
