import { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  const baseUrl =
    process.env.NEXT_PUBLIC_APP_URL || "https://ormanipomeri.vercel.app";

  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: ["/api/", "/account/", "/admin/"],
      },
      {
        // Block AI training crawlers
        userAgent: [
          "GPTBot", // OpenAI training
          "CCBot", // Common Crawl (training datasets)
          "Google-Extended", // Gemini training (doesn't affect Google Search)
          "anthropic-ai", // Anthropic training (legacy name)
          "ClaudeBot", // Anthropic training
          "Bytespider", // ByteDance/TikTok training
          "Applebot-Extended", // Apple AI training
          "Meta-ExternalAgent", // Meta AI training
          "cohere-ai", // Cohere training
          "PetalBot", // Huawei/Aspiegel AI training
          "Diffbot", // AI scraping
          "ImagesiftBot", // AI image training
          "Omgilibot", // AI data aggregation
          "img2dataset", // Image dataset scraping
        ],
        disallow: "/",
      },
      {
        // Allow AI browsing/search bots (helps users find your site via AI)
        userAgent: [
          "ChatGPT-User", // ChatGPT browsing
          "OAI-SearchBot", // OpenAI search
          "Claude-User", // Claude browsing
          "Claude-SearchBot", // Claude search
          "PerplexityBot", // Perplexity search
          "YouBot", // You.com search
        ],
        allow: "/",
        disallow: ["/api/", "/account/", "/admin/"],
      },
    ],
    sitemap: `${baseUrl}/sitemap.xml`,
  };
}
