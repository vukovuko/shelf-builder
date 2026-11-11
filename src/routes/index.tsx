import { createFileRoute } from "@tanstack/react-router";
import Link from "next/link";
import { LinkPending } from "@/components/PendingContent";
import { FaqSearchable } from "@/components/smoothui/faq-3";
import { Features } from "@/components/smoothui/features";
import { FooterComplex } from "@/components/smoothui/footer-2";
import { HeroGrid } from "@/components/smoothui/header-1";
import { SketchImport } from "@/components/smoothui/sketch-import";
import { StatsCards } from "@/components/smoothui/stats-2";
import { TestimonialsStars } from "@/components/smoothui/testimonials";
import { Button } from "@/components/ui/button";
import { faqJsonLd } from "@/lib/faq-data";
import { jsonLd, organizationJsonLd } from "@/lib/seo/site";

export const Route = createFileRoute("/")({
  head: () => ({
    scripts: [jsonLd(organizationJsonLd), jsonLd(faqJsonLd)],
  }),
  component: HomePage,
});

function HomePage() {
  return (
    <main>
      <HeroGrid />
      <StatsCards />
      <Features />
      <SketchImport />
      <FaqSearchable />
      <TestimonialsStars />
      <section className="py-8 text-center lg:py-14">
        <div className="mx-auto max-w-5xl px-6">
          <p className="mb-8 font-bold text-3xl text-foreground lg:text-4xl">
            Spremni da započnete?
          </p>
          <Button asChild size="lg">
            <Link href="/design">
              <LinkPending>Pokrenite konfigurator</LinkPending>
            </Link>
          </Button>
        </div>
      </section>
      <FooterComplex />
    </main>
  );
}
