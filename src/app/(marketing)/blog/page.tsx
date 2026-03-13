import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { FooterComplex } from "@/components/smoothui/footer-2";
import { HeroHeader } from "@/components/smoothui/shared";
import { blogPosts, formatDate } from "@/lib/blog-data";

export const metadata: Metadata = {
  title: "Blog o Ormanima po Meri | Saveti za Uređenje Doma",
  description:
    "Praktični saveti za izbor i organizaciju ormana po meri. Vodiči za materijale, dimenzije, unutrašnju opremu i dizajn nameštaja za vaš dom.",
};

export default function BlogPage() {
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: "Blog o Ormanima po Meri | Saveti za Uređenje Doma",
    description:
      "Praktični saveti za izbor i organizaciju ormana po meri. Vodiči za materijale, dimenzije, unutrašnju opremu i dizajn nameštaja za vaš dom.",
    inLanguage: "sr-Latn",
    mainEntity: {
      "@type": "ItemList",
      itemListElement: blogPosts.map((post, i) => ({
        "@type": "ListItem",
        position: i + 1,
        url: `/blog/${post.slug}`,
        name: post.title,
      })),
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
        <section className="py-10 lg:py-20">
          <div className="mx-auto max-w-3xl px-6">
            <h1 className="mb-4 text-3xl font-bold text-foreground lg:text-4xl">
              Blog
            </h1>
            <p className="mb-12 text-lg text-foreground/70">
              Saveti i vodiči za uređenje doma i izbor nameštaja po meri.
            </p>
            <div className="space-y-8">
              {blogPosts.map((post) => (
                <Link
                  key={post.slug}
                  href={`/blog/${post.slug}`}
                  className="group block rounded-2xl border border-border p-6 transition-colors hover:border-primary"
                >
                  <div className="mb-3 flex items-center gap-3 text-sm text-foreground/50">
                    <time dateTime={post.date}>{formatDate(post.date)}</time>
                    <span className="size-1 rounded-full bg-foreground/25" />
                    <span>{post.readTime} čitanja</span>
                  </div>
                  <h2 className="mb-2 text-xl font-semibold text-foreground group-hover:text-primary transition-colors">
                    {post.title}
                  </h2>
                  <p className="mb-4 text-foreground/70">{post.description}</p>
                  <span className="inline-flex items-center text-sm font-medium text-primary">
                    Pročitajte više
                    <ArrowRight className="ml-1 h-4 w-4 transition-transform group-hover:translate-x-1" />
                  </span>
                </Link>
              ))}
            </div>
          </div>
        </section>
      </main>
      <FooterComplex />
    </div>
  );
}
