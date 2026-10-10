import type { Metadata } from "next";
import { HandleCard } from "@/components/HandleCard";
import { FooterComplex } from "@/components/smoothui/footer-2";
import { HeroHeader } from "@/components/smoothui/shared";
import type { HandleKind } from "@/lib/handle-models";
import { getPublicHandleModels } from "@/lib/handle-pages-data";

// Handles and prices change from the admin; an hour old is fine here.
export const revalidate = 3600;

export const metadata: Metadata = {
  title: "Ručke za ormare i nameštaj | Ormani po meri",
  description:
    "Ručke (ručice), profil ručke i dugmad za ormare po meri: mere, završne obrade i cena po komadu. Izaberite ručku i napravite orman u 3D konfiguratoru.",
  alternates: { canonical: "/rucke" },
};

const SECTIONS: { kind: HandleKind; title: string }[] = [
  { kind: "rucka", title: "Ručke" },
  { kind: "profil", title: "Profil ručke" },
  { kind: "dugme", title: "Dugmad" },
];

export default async function HandlesPage() {
  const models = await getPublicHandleModels();

  return (
    <div className="relative">
      <HeroHeader />
      <main className="pt-24">
        <div className="mx-auto max-w-6xl px-6 py-8 lg:py-14">
          <h1 className="text-3xl font-bold tracking-tight lg:text-4xl">
            Ručke
          </h1>
          {SECTIONS.map(({ kind, title }) => {
            const items = models.filter((m) => m.kind === kind);
            if (items.length === 0) return null;
            return (
              <section key={kind} className="mt-12">
                <h2 className="text-xl font-semibold">
                  {title}{" "}
                  <span className="font-normal text-muted-foreground">
                    ({items.length})
                  </span>
                </h2>
                <div className="mt-6 grid grid-cols-2 gap-x-4 gap-y-6 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
                  {items.map((model) => (
                    <HandleCard key={model.key} model={model} />
                  ))}
                </div>
              </section>
            );
          })}
        </div>
      </main>
      <FooterComplex />
    </div>
  );
}
