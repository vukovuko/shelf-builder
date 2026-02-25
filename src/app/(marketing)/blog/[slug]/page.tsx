import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { FooterComplex } from "@/components/smoothui/footer-2";
import { HeroHeader } from "@/components/smoothui/shared";
import { blogPosts, getBlogPost, formatDate } from "@/lib/blog-data";
import { BlogContent } from "./blog-content";

interface Props {
  params: Promise<{ slug: string }>;
}

export async function generateStaticParams() {
  return blogPosts.map((post) => ({ slug: post.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const post = getBlogPost(slug);
  if (!post) return {};
  return {
    title: `${post.title} | Ormani po meri`,
    description: post.description,
  };
}

export default async function BlogPostPage({ params }: Props) {
  const { slug } = await params;
  const post = getBlogPost(slug);
  if (!post) notFound();

  const wordCount = post.content.split(/\s+/).length;

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "BlogPosting",
    headline: post.title,
    description: post.description,
    datePublished: post.date,
    wordCount,
    inLanguage: "sr-Latn",
    mainEntityOfPage: {
      "@type": "WebPage",
      "@id": `/blog/${slug}`,
    },
    author: { "@id": "/#organization" },
    publisher: { "@id": "/#organization" },
  };

  return (
    <div className="relative">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <HeroHeader />
      <main className="pt-24">
        <article className="py-10 lg:py-20">
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
          </div>
        </article>
      </main>
      <FooterComplex />
    </div>
  );
}
