import { FaqSearchable } from "@/components/smoothui/faq-3";
import { Features } from "@/components/smoothui/features";
import { FooterComplex } from "@/components/smoothui/footer-2";
import { HeroGrid } from "@/components/smoothui/header-1";
import { StatsCards } from "@/components/smoothui/stats-2";
import { TestimonialsStars } from "@/components/smoothui/testimonials";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { faqJsonLd } from "@/lib/faq-data";

const baseUrl =
  process.env.NEXT_PUBLIC_APP_URL || "https://ormanipomeri.vercel.app";

const organizationJsonLd = {
  "@context": "https://schema.org",
  "@type": "Organization",
  "@id": `${baseUrl}/#organization`,
  name: "Ormani po meri",
  url: baseUrl,
  logo: {
    "@type": "ImageObject",
    url: `${baseUrl}/ormani-po-meri-logo.webp`,
  },
  image: `${baseUrl}/ormani-po-meri-logo.webp`,
  description:
    "Dizajnirajte orman po meri online uz besplatan 3D konfigurator. Birajte dimenzije, materijale, police, fioke, vrata i dodatke.",
  sameAs: [
    "https://www.facebook.com/vuko.vukasinovic/",
    "https://www.instagram.com/vuko_vukasinovic/",
    "https://www.linkedin.com/in/vuko-vukasinovic/",
  ],
  hasOfferCatalog: {
    "@type": "OfferCatalog",
    name: "Usluge",
    itemListElement: [
      {
        "@type": "OfferCatalog",
        name: "Izrada nameštaja po meri",
        itemListElement: [
          {
            "@type": "Offer",
            itemOffered: {
              "@type": "Service",
              name: "Izrada ormana po meri",
              description:
                "Profesionalna izrada ormana, plakara i polica po meri od premium materijala. Preko 30 dostupnih materijala.",
            },
          },
          {
            "@type": "Offer",
            itemOffered: {
              "@type": "Service",
              name: "Montaža nameštaja",
              description:
                "Stručna montaža ormana i polica na lokaciji. Tim iskusnih montažera obezbeđuje preciznu ugradnju.",
            },
          },
          {
            "@type": "Offer",
            itemOffered: {
              "@type": "Service",
              name: "Dostava nameštaja",
              description:
                "Dostava gotovog nameštaja na adresu. Sigurno pakovanje i transport do vašeg doma.",
            },
          },
        ],
      },
    ],
  },
};

export default function HomePage() {
  return (
    <main>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationJsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }}
      />
      <HeroGrid />
      <StatsCards />
      <Features />
      <FaqSearchable />
      <TestimonialsStars />
      <section className="py-8 lg:py-14 text-center">
        <div className="mx-auto max-w-5xl px-6">
          <p className="mb-8 text-3xl font-bold text-foreground lg:text-4xl">
            Spremni da započnete?
          </p>
          <Button asChild size="lg">
            <Link href="/design">Pokrenite konfigurator</Link>
          </Button>
        </div>
      </section>
      <FooterComplex />
    </main>
  );
}
