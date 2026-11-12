import { useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute, notFound, redirect } from "@tanstack/react-router";
import { ArrowLeft, ArrowRight } from "lucide-react";
import Link from "next/link";
import { MaterialCard } from "@/components/MaterialCard";
import { FooterComplex } from "@/components/smoothui/footer-2";
import { HeroHeader } from "@/components/smoothui/shared";
import { Button } from "@/components/ui/button";
import {
  cleanMaterialName,
  formatPricePerM2,
  materialBrand,
  materialBreadcrumbJsonLd,
  materialJsonLd,
  materialKind,
  materialMetaDescription,
  materialUses,
} from "@/lib/material-pages";
import { jsonLd, SITE_URL, socialImage } from "@/lib/seo/site";
import { materialPageQuery } from "@/server/catalog.functions";

export const Route = createFileRoute("/materijali/$slug")({
  loader: async ({ context, params }) => {
    const page = await context.queryClient.ensureQueryData(
      materialPageQuery(params.slug),
    );
    if (!page) throw notFound();
    // The code finds the material; a renamed decor keeps working at its new URL.
    if (params.slug !== page.slug) {
      throw redirect({
        to: "/materijali/$slug",
        params: { slug: page.slug },
        statusCode: 308,
      });
    }
    return page;
  },
  head: ({ loaderData: page }) => {
    if (!page) return {};
    const { material } = page;
    const title = `${cleanMaterialName(material.name)} ${material.productCode ?? ""} | Ormani po meri`;
    const description = materialMetaDescription(material);
    return {
      meta: [
        { title },
        { name: "description", content: description },
        { property: "og:title", content: title },
        { property: "og:description", content: description },
        {
          property: "og:url",
          content: `${SITE_URL}/materijali/${page.slug}`,
        },
        ...(material.img ? socialImage(material.img) : []),
      ],
      scripts: [
        jsonLd(materialJsonLd(material, SITE_URL)),
        jsonLd(materialBreadcrumbJsonLd(material, SITE_URL)),
      ],
    };
  },
  component: MaterialPage,
});

function MaterialPage() {
  const { slug } = Route.useParams();
  const { data: page } = useSuspenseQuery(materialPageQuery(slug));
  // The loader has already turned a missing material into a 404.
  if (!page) return null;
  const { material, similar } = page;

  const name = cleanMaterialName(material.name);
  const uses = materialUses(material);
  const facts = [
    {
      label: "Debljina",
      value: material.thickness ? `${material.thickness} mm` : null,
    },
    { label: "Za", value: uses.charAt(0).toUpperCase() + uses.slice(1) },
    { label: "Proizvođač", value: materialBrand(material) },
    { label: "Cena", value: formatPricePerM2(material.price) },
  ].filter((fact) => fact.value);
  const paragraphs = (material.description ?? "")
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter(Boolean);

  return (
    <div className="relative">
      <HeroHeader />
      <main className="pt-24">
        <div className="mx-auto max-w-5xl px-6 py-8 lg:py-14">
          <Link
            href="/materijali"
            className="mb-8 inline-flex items-center text-sm text-foreground/50 transition-colors hover:text-primary"
          >
            <ArrowLeft className="mr-1 h-4 w-4" />
            Svi materijali
          </Link>

          <div className="grid items-start gap-8 md:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] md:gap-12">
            <div className="aspect-square overflow-hidden rounded-2xl border bg-muted">
              {material.img && (
                <img
                  src={material.img}
                  alt={`Dekor ${name} ${material.productCode ?? ""}`}
                  width={1000}
                  height={1000}
                  fetchPriority="high"
                  className="size-full object-cover"
                />
              )}
            </div>

            <div>
              {material.popularRank !== null && (
                <span className="mb-3 inline-block rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
                  Popularno
                </span>
              )}
              <h1 className="text-3xl font-bold tracking-tight lg:text-4xl">
                {name}{" "}
                <span className="block text-lg font-medium tracking-wide text-muted-foreground lg:text-xl">
                  {material.productCode}
                </span>
              </h1>

              <dl className="mt-6 divide-y rounded-xl border">
                {facts.map((fact) => (
                  <div
                    key={fact.label}
                    className="flex justify-between gap-4 px-4 py-3 text-sm"
                  >
                    <dt className="text-muted-foreground">{fact.label}</dt>
                    <dd className="text-right font-medium">{fact.value}</dd>
                  </div>
                ))}
              </dl>

              {paragraphs.length > 0 && (
                <div className="mt-6 space-y-3 leading-relaxed text-foreground/80">
                  {paragraphs.map((text) => (
                    <p key={text}>{text}</p>
                  ))}
                </div>
              )}

              <Button asChild size="lg" className="mt-6 w-full sm:w-auto">
                <Link href={`/design?material=${material.id}`}>
                  {materialKind(material) === "back"
                    ? "Napravi orman sa ovim leđima"
                    : "Napravi orman u ovom dekoru"}
                  <ArrowRight />
                </Link>
              </Button>
            </div>
          </div>

          {similar.length > 0 && (
            <section className="mt-16">
              <h2 className="text-xl font-semibold">Slični dekori</h2>
              <div className="mt-6 grid grid-cols-2 gap-x-4 gap-y-6 sm:grid-cols-3 lg:grid-cols-6">
                {similar.map((card) => (
                  <MaterialCard key={card.id} card={card} />
                ))}
              </div>
            </section>
          )}
        </div>
      </main>
      <FooterComplex />
    </div>
  );
}
