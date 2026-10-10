import type { Metadata } from "next";
import { toMaterialCard } from "@/components/MaterialCard";
import {
  type BrowserMaterial,
  MaterialsBrowser,
} from "@/components/MaterialsBrowser";
import { FooterComplex } from "@/components/smoothui/footer-2";
import { HeroHeader } from "@/components/smoothui/shared";
import {
  foldForSearch,
  MATERIAL_PAGES_INDEXED,
  materialBrand,
  materialKind,
} from "@/lib/material-pages";
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
  const items: BrowserMaterial[] = all.flatMap((material) => {
    const kind = materialKind(material);
    if (!kind) return [];
    const card = toMaterialCard(material);
    const brand = materialBrand(material) ?? "";
    return [
      {
        ...card,
        kind,
        rank: material.popularRank,
        search: foldForSearch(`${card.name} ${card.code ?? ""} ${brand}`),
      },
    ];
  });

  return (
    <div className="relative">
      <HeroHeader />
      <main className="pt-24">
        <div className="mx-auto max-w-6xl px-6 py-8 lg:py-14">
          <h1 className="text-3xl font-bold tracking-tight lg:text-4xl">
            Materijali
          </h1>
          <MaterialsBrowser items={items} />
        </div>
      </main>
      <FooterComplex />
    </div>
  );
}
