import { COMPANY_CONTACT } from "@/lib/company-contact";
import { COMPANY_SOCIALS } from "@/lib/company-socials";

/** The public address of the site, used in canonical links and structured data. */
export const SITE_URL = (
  process.env.NEXT_PUBLIC_APP_URL || "https://ormanipomeri.com"
).replace(/\/$/, "");

export const SITE_TITLE =
  "Ormani po meri | 3D Konfigurator za Ormare i Police po Meri";

export const SITE_DESCRIPTION =
  "Dizajnirajte orman po meri online uz besplatan 3D konfigurator. Birajte dimenzije, materijale, police, fioke, vrata i dodatke. Preko 30 premium materijala.";

const SOCIAL_DESCRIPTION =
  "Dizajnirajte orman po meri online uz besplatan 3D konfigurator. Birajte dimenzije, materijale, police, fioke, vrata i dodatke.";

/** A JSON-LD block for a route's `head().scripts`. */
export function jsonLd(data: unknown) {
  return { type: "application/ld+json", children: JSON.stringify(data) };
}

export const siteJsonLd = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "WebSite",
      "@id": `${SITE_URL}/#website`,
      url: SITE_URL,
      name: "Ormani po meri",
      description:
        "Dizajnirajte orman po meri online uz besplatan 3D konfigurator.",
      publisher: { "@id": `${SITE_URL}/#organization` },
      inLanguage: "sr-Latn",
    },
    {
      "@type": "WebApplication",
      "@id": `${SITE_URL}/design#configurator`,
      name: "Konfigurator ormana",
      description:
        "Besplatan 3D konfigurator za dizajniranje ormana po meri. Birajte dimenzije, materijale, vrata i dodatke.",
      url: `${SITE_URL}/design`,
      applicationCategory: "DesignApplication",
      operatingSystem: "All",
      browserRequirements: "Requires JavaScript and WebGL",
      offers: {
        "@type": "Offer",
        price: "0",
        priceCurrency: "RSD",
      },
      creator: { "@id": `${SITE_URL}/#organization` },
      featureList:
        "3D vizualizacija, Izbor materijala, Klizna vrata, Fioke, Police, PDF specifikacija",
      inLanguage: "sr-Latn",
    },
  ],
};

export const organizationJsonLd = {
  "@context": "https://schema.org",
  "@type": "Organization",
  "@id": `${SITE_URL}/#organization`,
  name: "Ormani po meri",
  url: SITE_URL,
  logo: {
    "@type": "ImageObject",
    url: `${SITE_URL}/ormani-po-meri-logo.webp`,
  },
  image: `${SITE_URL}/ormani-po-meri-logo.webp`,
  description: SOCIAL_DESCRIPTION,
  sameAs: COMPANY_SOCIALS.map((profile) => profile.url),
  telephone: COMPANY_CONTACT.phoneIntl,
  email: COMPANY_CONTACT.email,
  contactPoint: {
    "@type": "ContactPoint",
    contactType: "customer service",
    telephone: COMPANY_CONTACT.phoneIntl,
    email: COMPANY_CONTACT.email,
    areaServed: "RS",
    availableLanguage: "sr",
  },
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

/** Site-wide <meta> tags; a route's own `head()` overrides title and description. */
export const siteMeta = [
  { title: SITE_TITLE },
  { name: "description", content: SITE_DESCRIPTION },
  {
    name: "keywords",
    content:
      "ormani po meri, police po meri, konfigurator ormana, ormar po meri, polica po meri, 3D konfigurator, nameštaj po meri, plakari po meri, klizna vrata, ormar konfigurator online",
  },
  {
    name: "theme-color",
    content: "#1e1e2e",
    media: "(prefers-color-scheme: dark)",
  },
  {
    name: "theme-color",
    content: "#eff1f5",
    media: "(prefers-color-scheme: light)",
  },
  { name: "color-scheme", content: "light dark" },
  { name: "format-detection", content: "telephone=no" },
  { name: "mobile-web-app-capable", content: "yes" },
  { name: "apple-mobile-web-app-title", content: "Ormani po meri" },
  {
    name: "apple-mobile-web-app-status-bar-style",
    content: "black-translucent",
  },
  { property: "og:type", content: "website" },
  { property: "og:site_name", content: "Ormani po meri" },
  { property: "og:title", content: SITE_TITLE },
  { property: "og:description", content: SOCIAL_DESCRIPTION },
  { property: "og:locale", content: "sr_RS" },
  { property: "og:image", content: `${SITE_URL}/ormani-po-meri-logo.webp` },
  { name: "twitter:card", content: "summary_large_image" },
  { name: "twitter:title", content: SITE_TITLE },
  { name: "twitter:description", content: SOCIAL_DESCRIPTION },
];

export const siteLinks = [
  { rel: "manifest", href: "/site.webmanifest" },
  {
    rel: "icon",
    href: "/favicon-16x16.png",
    sizes: "16x16",
    type: "image/png",
  },
  {
    rel: "icon",
    href: "/favicon-32x32.png",
    sizes: "32x32",
    type: "image/png",
  },
  { rel: "icon", href: "/favicon.ico", sizes: "any" },
  { rel: "apple-touch-icon", href: "/apple-touch-icon.png", sizes: "180x180" },
];
