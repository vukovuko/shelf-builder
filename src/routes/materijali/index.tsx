import { useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { MaterialsBrowser } from "@/components/MaterialsBrowser";
import { FooterComplex } from "@/components/smoothui/footer-2";
import { HeroHeader } from "@/components/smoothui/shared";
import { pageMeta } from "@/lib/seo/site";
import { materialBrowserQuery } from "@/server/catalog.functions";

export const Route = createFileRoute("/materijali/")({
  loader: ({ context }) =>
    context.queryClient.ensureQueryData(materialBrowserQuery),
  head: () => ({
    meta: pageMeta({
      title: "Materijali za ormane po meri | Ormani po meri",
      description:
        "Svi dekori ploča za orman po meri sa šifrom, debljinom i cenom po m². Izaberite dekor i napravite orman u 3D konfiguratoru.",
    }),
  }),
  component: MaterialsPage,
});

function MaterialsPage() {
  const { data: items } = useSuspenseQuery(materialBrowserQuery);

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
