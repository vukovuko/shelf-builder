import { useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { BlogContent } from "@/components/BlogContent";
import { SocialIcon } from "@/components/SocialIcons";
import { FooterComplex } from "@/components/smoothui/footer-2";
import { HeroHeader } from "@/components/smoothui/shared";
import { type BlogPost, blogAuthor, formatDate } from "@/lib/blog-data";
import { jsonLd, SITE_URL, socialImage } from "@/lib/seo/site";
import { blogPostQuery } from "@/server/blog.functions";

export const Route = createFileRoute("/blog/$slug")({
  loader: ({ context, params }) =>
    context.queryClient.ensureQueryData(blogPostQuery(params.slug)),
  head: ({ loaderData: post }) => {
    if (!post) return {};
    return {
      meta: [
        { title: post.title },
        { name: "description", content: post.description },
        { property: "og:title", content: post.title },
        { property: "og:description", content: post.description },
        { property: "og:type", content: "article" },
        { property: "article:published_time", content: post.date },
        { property: "article:author", content: blogAuthor.name },
        ...socialImage(postImage(post)),
      ],
      scripts: [
        jsonLd(blogPostingJsonLd(post)),
        jsonLd(breadcrumbJsonLd(post)),
      ],
    };
  },
  component: BlogPostPage,
});

function postImage(post: BlogPost): string {
  return `${SITE_URL}${post.image ?? "/ormani-po-meri-logo.webp"}`;
}

function blogPostingJsonLd(post: BlogPost) {
  const url = `${SITE_URL}/blog/${post.slug}`;
  return {
    "@context": "https://schema.org",
    "@type": "BlogPosting",
    headline: post.title,
    description: post.description,
    image: postImage(post),
    datePublished: `${post.date}T00:00:00+01:00`,
    dateModified: `${post.date}T00:00:00+01:00`,
    wordCount: post.content.split(/\s+/).length,
    inLanguage: "sr-Latn",
    url,
    mainEntityOfPage: { "@type": "WebPage", "@id": url },
    author: {
      "@type": "Person",
      name: blogAuthor.name,
      image: `${SITE_URL}${blogAuthor.image}`,
      url: blogAuthor.socials[0].url,
      sameAs: blogAuthor.socials.map((s) => s.url),
    },
    publisher: {
      "@type": "Organization",
      name: "Ormani po meri",
      url: SITE_URL,
      logo: {
        "@type": "ImageObject",
        url: `${SITE_URL}/ormani-po-meri-logo.webp`,
      },
    },
  };
}

function breadcrumbJsonLd(post: BlogPost) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Početna", item: SITE_URL },
      {
        "@type": "ListItem",
        position: 2,
        name: "Blog",
        item: `${SITE_URL}/blog`,
      },
      {
        "@type": "ListItem",
        position: 3,
        name: post.title,
        item: `${SITE_URL}/blog/${post.slug}`,
      },
    ],
  };
}

function BlogPostPage() {
  const { slug } = Route.useParams();
  const { data: post } = useSuspenseQuery(blogPostQuery(slug));

  return (
    <div className="relative">
      <HeroHeader />
      <main className="pt-24">
        <article className="py-8 lg:py-14">
          <div className="mx-auto max-w-3xl px-6">
            <Link
              href="/blog"
              className="mb-8 inline-flex items-center text-sm text-foreground/50 hover:text-primary transition-colors"
            >
              <ArrowLeft className="mr-1 h-4 w-4" />
              Nazad na blog
            </Link>
            <div className="mb-8 flex items-center gap-3 text-sm text-foreground/50">
              <time dateTime={post.date}>{formatDate(post.date)}</time>
              <span className="size-1 rounded-full bg-foreground/25" />
              <span>{post.readTime} čitanja</span>
            </div>
            <h1 className="mb-8 text-3xl font-bold text-foreground lg:text-4xl">
              {post.title}
            </h1>
            <BlogContent content={post.content} />

            <div className="mt-12 border-t border-border pt-8">
              <div className="flex items-start gap-4">
                <Image
                  src={blogAuthor.image}
                  alt={blogAuthor.name}
                  width={48}
                  height={48}
                  className="h-12 w-12 shrink-0 rounded-full object-cover"
                />
                <div>
                  <p className="font-semibold text-foreground">
                    {blogAuthor.name}
                  </p>
                  <p className="mt-1 text-sm text-foreground/60">
                    {blogAuthor.bio}
                  </p>
                  <div className="mt-3 flex gap-3">
                    {blogAuthor.socials.map((social) => (
                      <a
                        key={social.platform}
                        href={social.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-foreground/40 hover:text-primary transition-colors"
                      >
                        <SocialIcon
                          platform={social.platform}
                          className="h-4 w-4"
                        />
                        <span className="sr-only">{social.label}</span>
                      </a>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </article>
      </main>
      <FooterComplex />
    </div>
  );
}
