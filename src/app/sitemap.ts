import type { MetadataRoute } from "next";
import { blogPosts } from "@/lib/blog-data";
import { MATERIAL_PAGES_INDEXED, materialSlug } from "@/lib/material-pages";
import { getPublicMaterials } from "@/lib/material-pages-data";

// Picks up materials added in the admin.
export const revalidate = 3600;

async function materialEntries(
  baseUrl: string,
): Promise<MetadataRoute.Sitemap> {
  if (!MATERIAL_PAGES_INDEXED) return [];
  try {
    const all = await getPublicMaterials();
    return [
      {
        url: `${baseUrl}/materijali`,
        changeFrequency: "weekly",
        priority: 0.7,
      },
      ...all.map((material) => ({
        url: `${baseUrl}/materijali/${materialSlug(material)}`,
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

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl =
    process.env.NEXT_PUBLIC_APP_URL || "https://ormanipomeri.vercel.app";

  const blogEntries: MetadataRoute.Sitemap = blogPosts.map((post) => ({
    url: `${baseUrl}/blog/${post.slug}`,
    lastModified: new Date(post.date),
    changeFrequency: "monthly",
    priority: 0.6,
  }));

  return [
    {
      url: baseUrl,
      lastModified: new Date("2026-03-11"),
      changeFrequency: "weekly",
      priority: 1.0,
    },
    {
      url: `${baseUrl}/design`,
      lastModified: new Date("2026-03-11"),
      changeFrequency: "weekly",
      priority: 0.9,
    },
    {
      url: `${baseUrl}/blog`,
      lastModified: new Date(
        blogPosts.length > 0
          ? blogPosts[blogPosts.length - 1].date
          : "2026-03-10",
      ),
      changeFrequency: "weekly",
      priority: 0.8,
    },
    ...blogEntries,
    ...(await materialEntries(baseUrl)),
    {
      url: `${baseUrl}/contact`,
      lastModified: new Date("2026-03-10"),
      changeFrequency: "monthly",
      priority: 0.6,
    },
    {
      url: `${baseUrl}/faq`,
      lastModified: new Date("2026-02-20"),
      changeFrequency: "monthly",
      priority: 0.7,
    },
    {
      url: `${baseUrl}/privacy`,
      lastModified: new Date("2026-02-15"),
      changeFrequency: "yearly",
      priority: 0.3,
    },
    {
      url: `${baseUrl}/terms`,
      lastModified: new Date("2026-02-15"),
      changeFrequency: "yearly",
      priority: 0.3,
    },
  ];
}
