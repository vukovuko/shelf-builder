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

function group(agents: string[], lines: string[]): string {
  return [...agents.map((agent) => `User-Agent: ${agent}`), ...lines].join(
    "\n",
  );
}

export function buildRobotsTxt(): string {
  // A build that search engines must not index (workers.dev) closes the door.
  if (!INDEXABLE) return "User-Agent: *\nDisallow: /\n";

  const open = ["Allow: /", ...PRIVATE.map((path) => `Disallow: ${path}`)];
  return `${[
    group(["*"], open),
    group(AI_AGENTS, open),
    group(HARVESTERS, ["Disallow: /"]),
    `Sitemap: ${SITE_URL}/sitemap.xml`,
  ].join("\n\n")}\n`;
}
