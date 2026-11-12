import { blogPosts } from "@/lib/blog-data";
import { getPublicHandleModels } from "@/lib/handle-pages-data";
import { MATERIAL_PAGES_INDEXED, materialSlug } from "@/lib/material-pages";
import { getPublicMaterials } from "@/lib/material-pages-data";
import { SITE_URL } from "@/lib/seo/site";

interface SitemapEntry {
  url: string;
  lastModified?: Date;
  changeFrequency: "weekly" | "monthly" | "yearly";
  priority: number;
}

async function handleEntries(): Promise<SitemapEntry[]> {
  try {
    const models = await getPublicHandleModels();
    return [
      { url: `${SITE_URL}/rucke`, changeFrequency: "weekly", priority: 0.6 },
      ...models.map((model) => ({
        url: `${SITE_URL}/rucke/${model.slug}`,
        changeFrequency: "monthly" as const,
        priority: 0.4,
      })),
    ];
  } catch (error) {
    console.error("sitemap: handles unavailable", error);
    return [];
  }
}

async function materialEntries(): Promise<SitemapEntry[]> {
  if (!MATERIAL_PAGES_INDEXED) return [];
  try {
    const all = await getPublicMaterials();
    return [
      {
        url: `${SITE_URL}/materijali`,
        changeFrequency: "weekly",
        priority: 0.7,
      },
      ...all.map((material) => ({
        url: `${SITE_URL}/materijali/${materialSlug(material)}`,
        changeFrequency: "monthly" as const,
        priority: 0.5,
      })),
    ];
  } catch (error) {
    // A database hiccup shouldn't drop the rest of the sitemap.
    console.error("sitemap: materials unavailable", error);
    return [];
  }
}

async function sitemapEntries(): Promise<SitemapEntry[]> {
  const blogEntries: SitemapEntry[] = blogPosts.map((post) => ({
    url: `${SITE_URL}/blog/${post.slug}`,
    lastModified: new Date(post.date),
    changeFrequency: "monthly",
    priority: 0.6,
  }));
  const [materials, handles] = await Promise.all([
    materialEntries(),
    handleEntries(),
  ]);

  return [
    {
      url: SITE_URL,
      lastModified: new Date("2026-03-11"),
      changeFrequency: "weekly",
      priority: 1.0,
    },
    {
      url: `${SITE_URL}/design`,
      lastModified: new Date("2026-03-11"),
      changeFrequency: "weekly",
      priority: 0.9,
    },
    {
      url: `${SITE_URL}/blog`,
      lastModified: new Date(
        blogPosts.length > 0
          ? blogPosts[blogPosts.length - 1].date
          : "2026-03-10",
      ),
      changeFrequency: "weekly",
      priority: 0.8,
    },
    ...blogEntries,
    ...materials,
    ...handles,
    {
      url: `${SITE_URL}/contact`,
      lastModified: new Date("2026-03-10"),
      changeFrequency: "monthly",
      priority: 0.6,
    },
    {
      url: `${SITE_URL}/faq`,
      lastModified: new Date("2026-02-20"),
      changeFrequency: "monthly",
      priority: 0.7,
    },
    {
      url: `${SITE_URL}/privacy`,
      lastModified: new Date("2026-02-15"),
      changeFrequency: "yearly",
      priority: 0.3,
    },
    {
      url: `${SITE_URL}/terms`,
      lastModified: new Date("2026-02-15"),
      changeFrequency: "yearly",
      priority: 0.3,
    },
  ];
}

function escapeXml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

export async function buildSitemapXml(): Promise<string> {
  const urls = (await sitemapEntries()).map((entry) =>
    [
      "<url>",
      `<loc>${escapeXml(entry.url)}</loc>`,
      entry.lastModified
        ? `<lastmod>${entry.lastModified.toISOString()}</lastmod>`
        : null,
      `<changefreq>${entry.changeFrequency}</changefreq>`,
      `<priority>${entry.priority}</priority>`,
      "</url>",
    ]
      .filter(Boolean)
      .join("\n"),
  );
  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
    ...urls,
    "</urlset>",
    "",
  ].join("\n");
}
