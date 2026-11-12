import { createFileRoute } from "@tanstack/react-router";
import { FaqSearchable } from "@/components/smoothui/faq-3";
import { FooterComplex } from "@/components/smoothui/footer-2";
import { HeroHeader } from "@/components/smoothui/shared";
import { faqJsonLd } from "@/lib/faq-data";
import { jsonLd, pageMeta } from "@/lib/seo/site";

export const Route = createFileRoute("/faq")({
  head: () => ({
    meta: pageMeta({
      title: "Česta Pitanja o Ormanima po Meri | FAQ",
      description:
        "Odgovori na najčešća pitanja o konfiguratoru ormana po meri. Saznajte sve o dimenzijama, materijalima, kliznim vratima, cenama i naručivanju.",
    }),
    scripts: [jsonLd(faqJsonLd)],
  }),
  component: FaqPage,
});

function FaqPage() {
  return (
    <div className="relative">
      <HeroHeader />
      <main className="pt-24">
        <FaqSearchable headingAs="h1" />
      </main>
      <FooterComplex />
    </div>
  );
}
