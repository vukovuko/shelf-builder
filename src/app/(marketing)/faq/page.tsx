import type { Metadata } from "next";
import { FaqSearchable } from "@/components/smoothui/faq-3";
import { FooterComplex } from "@/components/smoothui/footer-2";
import { HeroHeader } from "@/components/smoothui/shared";
import { faqJsonLd } from "@/lib/faq-data";

export const metadata: Metadata = {
  title: "Česta pitanja | Ormani po meri",
  description:
    "Odgovori na najčešća pitanja o konfiguratoru ormana po meri. Saznajte sve o dimenzijama, materijalima, kliznim vratima, cenama i naručivanju.",
};

export default function FaqPage() {
  return (
    <div className="relative">
      <HeroHeader />
      <main className="pt-24">
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }}
        />
        <FaqSearchable />
      </main>
      <FooterComplex />
    </div>
  );
}
