import { MetadataRoute } from "next";
import { blogPosts } from "@/lib/blog-data";

export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl =
    process.env.NEXT_PUBLIC_APP_URL || "https://ormanipomeri.vercel.app";

  const blogEntries: MetadataRoute.Sitemap = blogPosts.map((post) => ({
    url: `${baseUrl}/blog/${post.slug}`,
    lastModified: new Date(post.date),
  }));

  return [
    {
      url: baseUrl,
      lastModified: new Date("2026-03-11"),
    },
    {
      url: `${baseUrl}/design`,
      lastModified: new Date("2026-03-11"),
    },
    {
      url: `${baseUrl}/blog`,
      lastModified: new Date(
        blogPosts.length > 0
          ? blogPosts[blogPosts.length - 1].date
          : "2026-03-10",
      ),
    },
    ...blogEntries,
    {
      url: `${baseUrl}/contact`,
      lastModified: new Date("2026-03-10"),
    },
    {
      url: `${baseUrl}/faq`,
      lastModified: new Date("2026-02-20"),
    },
    {
      url: `${baseUrl}/privacy`,
      lastModified: new Date("2026-02-15"),
    },
    {
      url: `${baseUrl}/terms`,
      lastModified: new Date("2026-02-15"),
    },
  ];
}
