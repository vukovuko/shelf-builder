import { useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { ArrowRight } from "lucide-react";
import Link from "next/link";
import { FooterComplex } from "@/components/smoothui/footer-2";
import { HeroHeader } from "@/components/smoothui/shared";
import { formatDate } from "@/lib/blog-data";
import { jsonLd, pageMeta } from "@/lib/seo/site";
import { type BlogListItem, blogListQuery } from "@/server/blog.functions";

const TITLE = "Blog o Ormanima po Meri | Saveti za Uređenje Doma";
const DESCRIPTION =
  "Praktični saveti za izbor i organizaciju ormana po meri. Vodiči za materijale, dimenzije, unutrašnju opremu i dizajn nameštaja za vaš dom.";

export const Route = createFileRoute("/blog/")({
  loader: ({ context }) => context.queryClient.ensureQueryData(blogListQuery),
  head: ({ loaderData }) => ({
    meta: pageMeta({ title: TITLE, description: DESCRIPTION }),
    scripts: loaderData ? [jsonLd(collectionJsonLd(loaderData))] : [],
  }),
  component: BlogPage,
});

function collectionJsonLd(posts: BlogListItem[]) {
  return {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: TITLE,
    description: DESCRIPTION,
    inLanguage: "sr-Latn",
    mainEntity: {
      "@type": "ItemList",
      itemListElement: posts.map((post, i) => ({
        "@type": "ListItem",
        position: i + 1,
        url: `/blog/${post.slug}`,
        name: post.title,
      })),
    },
  };
}

function BlogPage() {
  const { data: blogPosts } = useSuspenseQuery(blogListQuery);
  const sortedPosts = [...blogPosts].sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
  );

  return (
    <div className="relative">
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
