import { FaqSearchable } from "@/components/smoothui/faq-3";
import { FooterComplex } from "@/components/smoothui/footer-2";
import { HeroGrid } from "@/components/smoothui/header-1";
import { StatsCards } from "@/components/smoothui/stats-2";
import { TestimonialsStars } from "@/components/smoothui/testimonials";
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
      <FaqSearchable />
      <TestimonialsStars />
      <section className="py-10 lg:py-20 text-center">
        <div className="mx-auto max-w-2xl px-6">
          <h2 className="mb-4 text-3xl font-bold text-foreground lg:text-4xl">
            Spremni da započnete?
          </h2>
          <p className="mx-auto mb-8 max-w-xl text-foreground/70 text-lg">
            Vaš savršen orman je samo par klikova daleko. Pokrenite konfigurator
            i dizajnirajte orman koji odgovara vašem prostoru.
          </p>
          <a
            href="/design"
            className="inline-flex items-center justify-center rounded-md bg-primary px-8 py-3 text-sm font-medium text-primary-foreground shadow hover:bg-primary/90 transition"
          >
            Pokrenite konfigurator
          </a>
        </div>
      </section>
      <FooterComplex />
    </main>
  );
}
