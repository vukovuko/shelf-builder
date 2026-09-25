import type { MetadataRoute } from "next";

const PRIVATE = [
  "/api/",
  "/account/",
  "/admin/",
  "/prijava",
  "/todo-board",
  "/todo-auth",
];

export default function robots(): MetadataRoute.Robots {
  const baseUrl =
    process.env.NEXT_PUBLIC_APP_URL || "https://ormanipomeri.vercel.app";

  return {
    rules: [
      // Search engines and AI assistants alike. Being read by AI is how the
      // site gets named in ChatGPT, Claude, Gemini and Perplexity answers:
      // Google-Extended also covers Gemini quoting the site live
      // ("grounding"), not only training.
      {
        userAgent: "*",
        allow: "/",
        disallow: PRIVATE,
      },
      {
        userAgent: [
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
        ],
        allow: "/",
        disallow: PRIVATE,
      },
      {
        // Bulk image and data harvesters: no visibility in return.
        userAgent: ["img2dataset", "ImagesiftBot", "Diffbot", "Omgilibot"],
        disallow: "/",
      },
    ],
    sitemap: `${baseUrl}/sitemap.xml`,
  };
}
