import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { SocialIcon } from "@/components/SocialIcons";
import { FooterComplex } from "@/components/smoothui/footer-2";
import { HeroHeader } from "@/components/smoothui/shared";
import {
  blogPosts,
  getBlogPost,
  formatDate,
  blogAuthor,
} from "@/lib/blog-data";
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
  const baseUrl =
    process.env.NEXT_PUBLIC_APP_URL || "https://ormanipomeri.vercel.app";
  const image = post.image ?? "/ormani-po-meri-logo.webp";
  return {
    title: `${post.title} | Ormani po meri`,
    description: post.description,
    openGraph: {
      title: post.title,
      description: post.description,
      type: "article",
      publishedTime: post.date,
      authors: [blogAuthor.name],
      images: [{ url: `${baseUrl}${image}` }],
    },
  };
}

export default async function BlogPostPage({ params }: Props) {
  const { slug } = await params;
  const post = getBlogPost(slug);
  if (!post) notFound();

  const baseUrl =
    process.env.NEXT_PUBLIC_APP_URL || "https://ormanipomeri.vercel.app";
  const wordCount = post.content.split(/\s+/).length;
  const postImage = post.image
    ? `${baseUrl}${post.image}`
    : `${baseUrl}/ormani-po-meri-logo.webp`;

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "BlogPosting",
    headline: post.title,
    description: post.description,
    image: postImage,
    datePublished: post.date,
    dateModified: post.date,
    wordCount,
    inLanguage: "sr-Latn",
    url: `${baseUrl}/blog/${slug}`,
    mainEntityOfPage: {
      "@type": "WebPage",
      "@id": `${baseUrl}/blog/${slug}`,
    },
    author: {
      "@type": "Person",
      name: blogAuthor.name,
      image: `${baseUrl}${blogAuthor.image}`,
      url: blogAuthor.socials[0].url,
      sameAs: blogAuthor.socials.map((s) => s.url),
    },
    publisher: {
      "@type": "Organization",
      name: "Ormani po meri",
      url: baseUrl,
      logo: {
        "@type": "ImageObject",
        url: `${baseUrl}/ormani-po-meri-logo.webp`,
      },
    },
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
