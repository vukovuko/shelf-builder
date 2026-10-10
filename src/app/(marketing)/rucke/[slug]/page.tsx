import { ArrowLeft, ArrowRight } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { formatHandlePrice, HandleCard } from "@/components/HandleCard";
import { FooterComplex } from "@/components/smoothui/footer-2";
import { HeroHeader } from "@/components/smoothui/shared";
import { Button } from "@/components/ui/button";
import { HANDLE_KIND_LABELS } from "@/lib/handle-models";
import {
  getPublicHandleModels,
  type HandlePageModel,
  type HandleVariant,
} from "@/lib/handle-pages-data";

// Handles and prices change from the admin; an hour old is fine here.
export const revalidate = 3600;

// Rendered on first visit, then cached.
export async function generateStaticParams() {
  return [];
}

interface Props {
  params: Promise<{ slug: string }>;
}

async function findModel(slug: string) {
  const all = await getPublicHandleModels();
  return { all, model: all.find((m) => m.slug === slug) };
}

function unique(values: (string | null)[]): string[] {
  return [...new Set(values.filter((v): v is string => v !== null))];
}

function designHref(variant: HandleVariant): string {
  return `/design?rucka=${encodeURIComponent(variant.handleKey)}&zavrsna=${encodeURIComponent(variant.finishKey)}`;
}

function listSr(items: string[]): string {
  return items.length > 1
    ? `${items.slice(0, -1).join(", ")} i ${items.at(-1)}`
    : (items[0] ?? "");
}

/** "razmak rupa 96, 128 i 160 mm" instead of one phrase per size. */
function sizesSummary(sizes: string[]): string | null {
  const numbers = (prefix: string) =>
    sizes
      .filter((s) => s.startsWith(prefix))
      .map((s) => s.match(/\d+/)?.[0] ?? "");
  const spacing = numbers("Razmak");
  const length = numbers("Dužina");
  const parts = [
    spacing.length ? `razmak rupa ${listSr(spacing)} mm` : null,
    length.length ? `dužina ${listSr(length)} mm` : null,
  ].filter(Boolean);
  return parts.length ? parts.join(", ") : null;
}

/** Search-result description: what it is, sizes, finishes, price. */
function metaDescription(model: HandlePageModel): string {
  const kind = HANDLE_KIND_LABELS[model.kind].toLowerCase();
  const parts = [
    `${model.name}: ${kind} za ormare i nameštaj`,
    model.material ? model.material.toLowerCase() : null,
    sizesSummary(unique(model.variants.map((v) => v.size))),
  ].filter(Boolean);
  return `${parts.join(", ")}. Završne obrade: ${unique(model.variants.map((v) => v.finish)).join(", ")}. Cena ${formatHandlePrice(model)}.`;
}

// "<" escaped so a name from the admin can never close the script tag.
function jsonLdHtml(data: unknown): string {
  return JSON.stringify(data).replace(/</g, "\\u003c");
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const { model } = await findModel(slug);
  if (!model) return {};
  const title = `${model.name}${model.brand ? ` ${model.brand}` : ""} | Ormani po meri`;
  const description = metaDescription(model);
  return {
    title,
    description,
    alternates: { canonical: `/rucke/${model.slug}` },
    openGraph: {
      title,
      description,
      url: `/rucke/${model.slug}`,
      images: model.image ? [{ url: model.image }] : undefined,
    },
  };
}

export default async function HandleModelPage({ params }: Props) {
  const { slug } = await params;
  const { all, model } = await findModel(slug);
  if (!model) notFound();

  const baseUrl =
    process.env.NEXT_PUBLIC_APP_URL || "https://ormanipomeri.vercel.app";
  const url = `${baseUrl}/rucke/${model.slug}`;
  const sizes = unique(model.variants.map((v) => v.size));
  // "Razmak rupa 96 mm" → column "Razmak rupa", cell "96 mm".
  const sizeHeader = sizes.every((s) => s.startsWith("Dužina"))
    ? "Dužina"
    : sizes.every((s) => s.startsWith("Razmak"))
      ? "Razmak rupa"
      : "Mera";
  const sizeCell = (size: string | null) =>
    size === null
      ? "—"
      : sizeHeader === "Mera"
        ? size
        : size.replace(/^(Dužina|Razmak rupa)\s+/, "");
  const facts = [
    { label: "Tip", value: HANDLE_KIND_LABELS[model.kind] },
    { label: "Materijal", value: model.material },
    { label: "Proizvođač", value: model.brand },
    { label: "Cena", value: formatHandlePrice(model) },
  ].filter((fact) => fact.value);
  const similar = all
    .filter((m) => m.kind === model.kind && m.key !== model.key)
    .sort(
      (a, b) =>
        Math.abs(a.minPrice - model.minPrice) -
        Math.abs(b.minPrice - model.minPrice),
    )
    .slice(0, 6);

  // schema.org product snippet: sold as part of a wardrobe, not on its own,
  // so an AggregateOffer over its sizes and finishes, not merchant markup.
  const productJsonLd = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: model.name,
    description: metaDescription(model),
    image: model.image ?? undefined,
    url,
    category: HANDLE_KIND_LABELS[model.kind],
    material: model.material ?? undefined,
    brand: model.brand ? { "@type": "Brand", name: model.brand } : undefined,
    offers: {
      "@type": "AggregateOffer",
      lowPrice: model.minPrice,
      highPrice: model.maxPrice,
      priceCurrency: "RSD",
      offerCount: model.variants.length,
      availability: "https://schema.org/InStock",
      seller: { "@type": "Organization", name: "Ormani po meri", url: baseUrl },
    },
  };
  const breadcrumbJsonLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Početna", item: baseUrl },
      {
        "@type": "ListItem",
        position: 2,
        name: "Ručke",
        item: `${baseUrl}/rucke`,
      },
      { "@type": "ListItem", position: 3, name: model.name, item: url },
    ],
  };

  return (
    <div className="relative">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: jsonLdHtml(productJsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: jsonLdHtml(breadcrumbJsonLd) }}
      />
      <HeroHeader />
      <main className="pt-24">
        <div className="mx-auto max-w-5xl px-6 py-8 lg:py-14">
          <Link
            href="/rucke"
            className="mb-8 inline-flex items-center text-sm text-foreground/50 transition-colors hover:text-primary"
          >
            <ArrowLeft className="mr-1 h-4 w-4" />
            Sve ručke
          </Link>

          <div className="grid items-start gap-8 md:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] md:gap-12">
            <div className="aspect-square overflow-hidden rounded-2xl border bg-white p-8">
              {model.image && (
                <img
                  src={model.image}
                  alt={model.name}
                  fetchPriority="high"
                  className="size-full object-contain"
                />
              )}
            </div>

            <div>
              <h1 className="text-3xl font-bold tracking-tight lg:text-4xl">
                {model.name}
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

              <Button asChild size="lg" className="mt-6 w-full sm:w-auto">
                <Link href={designHref(model.variants[0])}>
                  {model.kind === "dugme"
                    ? "Napravi orman sa ovim dugmetom"
                    : "Napravi orman sa ovom ručkom"}
                  <ArrowRight />
                </Link>
              </Button>
            </div>
          </div>

          <section className="mt-12">
            <h2 className="text-xl font-semibold">
              {sizes.length > 0 ? "Mere i završne obrade" : "Završne obrade"}
            </h2>
            <div className="mt-4 overflow-x-auto rounded-xl border">
              <table className="w-full text-sm">
                <thead className="bg-muted/50 text-left text-muted-foreground">
                  <tr>
                    <th className="hidden px-3 py-2 font-medium sm:table-cell" />
                    {sizes.length > 0 && (
                      <th className="px-3 py-2 font-medium">{sizeHeader}</th>
                    )}
                    <th className="px-3 py-2 font-medium">Završna obrada</th>
                    <th className="px-3 py-2 text-right font-medium">Cena</th>
                    <th className="px-3 py-2" />
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {model.variants.map((variant) => (
                    <tr key={`${variant.handleKey}-${variant.finishKey}`}>
                      <td className="hidden w-16 px-3 py-2 sm:table-cell">
                        {variant.image && (
                          <img
                            src={variant.image}
                            alt=""
                            loading="lazy"
                            className="size-10 rounded border bg-white object-contain"
                          />
                        )}
                      </td>
                      {sizes.length > 0 && (
                        <td className="px-3 py-2 whitespace-nowrap">
                          {sizeCell(variant.size)}
                        </td>
                      )}
                      <td className="px-3 py-2">{variant.finish}</td>
                      <td className="px-3 py-2 text-right whitespace-nowrap tabular-nums">
                        {variant.price.toLocaleString("sr-RS")} RSD
                      </td>
                      <td className="px-3 py-2 text-right">
                        <Link
                          href={designHref(variant)}
                          className="text-primary hover:underline"
                        >
                          Izaberi
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          {similar.length > 0 && (
            <section className="mt-16">
              <h2 className="text-xl font-semibold">Slične ručke</h2>
              <div className="mt-6 grid grid-cols-2 gap-x-4 gap-y-6 sm:grid-cols-3 lg:grid-cols-6">
                {similar.map((m) => (
                  <HandleCard key={m.key} model={m} />
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
