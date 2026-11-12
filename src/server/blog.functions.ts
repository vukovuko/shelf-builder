import { queryOptions } from "@tanstack/react-query";
import { notFound } from "@tanstack/react-router";
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { type BlogPost, blogPosts, getBlogPost } from "@/lib/blog-data";

// The articles live in src/lib/blog-data.ts. They are read through server
// functions so that the text of every post is not shipped in the page's
// JavaScript; a page gets only the post it shows.

/** A post as the blog list shows it: everything but the text. */
export type BlogListItem = Omit<BlogPost, "content" | "image">;

const listBlogPosts = createServerFn({ method: "GET" }).handler(
  (): BlogListItem[] =>
    blogPosts.map(({ slug, title, description, date, readTime }) => ({
      slug,
      title,
      description,
      date,
      readTime,
    })),
);

const readBlogPost = createServerFn({ method: "GET" })
  .validator(z.object({ slug: z.string().max(200) }))
  .handler(({ data }) => {
    const post = getBlogPost(data.slug);
    if (!post) throw notFound();
    return post;
  });

// Articles change only with a deploy.
const staleTime = Number.POSITIVE_INFINITY;

export const blogListQuery = queryOptions({
  queryKey: ["blog", "list"],
  queryFn: () => listBlogPosts(),
  staleTime,
});

export const blogPostQuery = (slug: string) =>
  queryOptions({
    queryKey: ["blog", "post", slug],
    queryFn: () => readBlogPost({ data: { slug } }),
    staleTime,
  });
