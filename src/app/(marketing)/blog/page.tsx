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
  const sortedPosts = [...blogPosts].sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
  );

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
        <section className="py-8 lg:py-14">
          <div className="mx-auto max-w-3xl px-6">
            <h1 className="mb-4 text-3xl font-bold text-foreground lg:text-4xl">
              Blog o ormanima po meri
            </h1>
            <p className="mb-12 text-lg text-foreground/70">
              Saveti i vodiči za uređenje doma i izbor nameštaja po meri.
            </p>
            <div className="space-y-8">
              {blogPosts.length === 0 && (
                <p className="py-12 text-center text-foreground/60">
                  Još uvek nema objavljenih članaka. Vratite se uskoro!
                </p>
              )}
              {sortedPosts.map((post, index) => (
                <Link
                  key={post.slug}
                  href={`/blog/${post.slug}`}
                  className={`group block rounded-2xl border border-border transition-colors hover:border-primary ${
                    index === 0 ? "p-8" : "p-6"
                  }`}
                >
                  <div className="mb-3 flex items-center gap-3 text-sm text-foreground/50">
                    <time dateTime={post.date}>{formatDate(post.date)}</time>
                    <span className="size-1 rounded-full bg-foreground/25" />
                    <span>{post.readTime} čitanja</span>
                  </div>
                  <h2
                    className={`mb-2 font-semibold text-foreground group-hover:text-primary transition-colors ${
                      index === 0 ? "text-2xl lg:text-3xl" : "text-xl"
                    }`}
                  >
                    {post.title}
                  </h2>
                  <p
                    className={`mb-4 text-foreground/70 ${
                      index === 0 ? "text-lg" : ""
                    }`}
                  >
                    {post.description}
                  </p>
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
