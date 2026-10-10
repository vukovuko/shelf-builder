import { ArrowLeft, ArrowRight } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound, permanentRedirect } from "next/navigation";
import { MaterialCard, toMaterialCard } from "@/components/MaterialCard";
import { FooterComplex } from "@/components/smoothui/footer-2";
import { HeroHeader } from "@/components/smoothui/shared";
import { Button } from "@/components/ui/button";
import {
  cleanMaterialName,
  codeFromSlug,
  formatPricePerM2,
  MATERIAL_PAGES_INDEXED,
  materialBrand,
  materialBreadcrumbJsonLd,
  materialCodeSlug,
  materialJsonLd,
  materialKind,
  materialMetaDescription,
  materialSlug,
  materialUses,
  similarMaterials,
} from "@/lib/material-pages";
import { getPublicMaterials } from "@/lib/material-pages-data";

// Materials change from the admin; an hour old is fine for these pages.
export const revalidate = 3600;

// Rendered on first visit, then cached: 500+ pages would slow every build.
export async function generateStaticParams() {
  return [];
}

// "<" escaped so a name from the admin can never close the script tag.
function jsonLdHtml(data: unknown): string {
  return JSON.stringify(data).replace(/</g, "\\u003c");
}

interface Props {
  params: Promise<{ slug: string }>;
}

async function findMaterial(slug: string) {
  const all = await getPublicMaterials();
  const code = codeFromSlug(slug);
  return { all, material: all.find((m) => materialCodeSlug(m) === code) };
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const { material } = await findMaterial(slug);
  if (!material) return {};
  const title = `${cleanMaterialName(material.name)} ${material.productCode ?? ""} | Ormani po meri`;
  const description = materialMetaDescription(material);
  return {
    title,
    description,
    alternates: { canonical: `/materijali/${materialSlug(material)}` },
    robots: MATERIAL_PAGES_INDEXED
      ? { index: true, follow: true }
      : { index: false, follow: true },
    openGraph: {
      title,
      description,
      url: `/materijali/${materialSlug(material)}`,
      images: material.img ? [{ url: material.img }] : undefined,
    },
  };
}

export default async function MaterialPage({ params }: Props) {
  const { slug } = await params;
  const { all, material } = await findMaterial(slug);
  if (!material) notFound();
  // The code finds the material; a renamed decor keeps working at its new URL.
  const canonical = materialSlug(material);
  if (slug !== canonical) permanentRedirect(`/materijali/${canonical}`);

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
  const similar = similarMaterials(material, all);
  const baseUrl =
    process.env.NEXT_PUBLIC_APP_URL || "https://ormanipomeri.vercel.app";

  return (
    <div className="relative">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: jsonLdHtml(materialJsonLd(material, baseUrl)),
        }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: jsonLdHtml(materialBreadcrumbJsonLd(material, baseUrl)),
        }}
      />
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
                {similar.map((m) => (
                  <MaterialCard key={m.id} card={toMaterialCard(m)} />
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
