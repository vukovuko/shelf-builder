import type { Metadata } from "next";
import { MaterialCard } from "@/components/MaterialCard";
import { FooterComplex } from "@/components/smoothui/footer-2";
import { HeroHeader } from "@/components/smoothui/shared";
import { MATERIAL_PAGES_INDEXED, materialKind } from "@/lib/material-pages";
import { getPublicMaterials } from "@/lib/material-pages-data";

// Materials change from the admin; an hour old is fine for these pages.
export const revalidate = 3600;

export const metadata: Metadata = {
  title: "Materijali za ormane po meri | Ormani po meri",
  description:
    "Svi dekori ploča za orman po meri sa šifrom, debljinom i cenom po m². Izaberite dekor i napravite orman u 3D konfiguratoru.",
  alternates: { canonical: "/materijali" },
  robots: MATERIAL_PAGES_INDEXED
    ? { index: true, follow: true }
    : { index: false, follow: true },
};

export default async function MaterialsPage() {
  const all = await getPublicMaterials();
  const sections = [
    { title: "Ploče", items: all.filter((m) => materialKind(m) === "board") },
    {
      title: "Leđa ormana",
      items: all.filter((m) => materialKind(m) === "back"),
    },
  ].filter((section) => section.items.length > 0);

  return (
    <div className="relative">
      <HeroHeader />
      <main className="pt-24">
        <div className="mx-auto max-w-6xl px-6 py-8 lg:py-14">
          <h1 className="text-3xl font-bold tracking-tight lg:text-4xl">
            Materijali
          </h1>
          {sections.map((section) => (
            <section key={section.title} className="mt-12">
              <h2 className="text-xl font-semibold">
                {section.title}{" "}
                <span className="font-normal text-muted-foreground">
                  ({section.items.length})
                </span>
              </h2>
              <div className="mt-6 grid grid-cols-2 gap-x-4 gap-y-6 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
                {section.items.map((material) => (
                  <MaterialCard key={material.id} material={material} />
                ))}
              </div>
            </section>
          ))}
        </div>
      </main>
      <FooterComplex />
    </div>
  );
}
