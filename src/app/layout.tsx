import type { Metadata } from "next";
import { Poppins } from "next/font/google";
import NextTopLoader from "nextjs-toploader";
import { Toaster } from "@/components/ui/sonner";
import "./globals.css";
import { AuthSessionProvider } from "@/components/AuthSessionProvider";
import { PostHogProvider } from "./providers";

const poppins = Poppins({
  subsets: ["latin"],
  weight: ["100", "200", "300", "400", "500", "600", "700", "800", "900"],
  style: ["normal"],
  variable: "--font-poppins",
});

const baseUrl =
  process.env.NEXT_PUBLIC_APP_URL || "https://ormanipomeri.vercel.app";

export const metadata: Metadata = {
  metadataBase: new URL(baseUrl),
  title: "Ormani po meri | 3D Konfigurator za Ormare i Police po Meri",
  description:
    "Dizajnirajte orman po meri online uz besplatan 3D konfigurator. Birajte dimenzije, materijale, police, fioke, vrata i dodatke. Preko 30 premium materijala.",
  keywords: [
    "ormani po meri",
    "police po meri",
    "konfigurator ormana",
    "ormar po meri",
    "polica po meri",
    "3D konfigurator",
    "nameštaj po meri",
    "plakari po meri",
    "klizna vrata",
    "ormar konfigurator online",
  ],
  manifest: "/site.webmanifest",
  icons: {
    icon: [
      { url: "/favicon-16x16.png", sizes: "16x16", type: "image/png" },
      { url: "/favicon-32x32.png", sizes: "32x32", type: "image/png" },
      { url: "/favicon.ico", sizes: "any" },
    ],
    apple: [
      { url: "/apple-touch-icon.png", sizes: "180x180", type: "image/png" },
    ],
    other: [
      {
        rel: "android-chrome-192x192",
        url: "/android-chrome-192x192.png",
      },
      {
        rel: "android-chrome-512x512",
        url: "/android-chrome-512x512.png",
      },
    ],
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Ormani po meri",
  },
  formatDetection: {
    telephone: false,
  },
  alternates: {
    canonical: "./",
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  openGraph: {
    type: "website",
    siteName: "Ormani po meri",
    title: "Ormani po meri | 3D Konfigurator za Ormare i Police po Meri",
    description:
      "Dizajnirajte orman po meri online uz besplatan 3D konfigurator. Birajte dimenzije, materijale, police, fioke, vrata i dodatke.",
    locale: "sr_RS",
    images: [{ url: "/ormani-po-meri-logo.webp" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Ormani po meri | 3D Konfigurator za Ormare i Police po Meri",
    description:
      "Dizajnirajte orman po meri online uz besplatan 3D konfigurator. Birajte dimenzije, materijale, police, fioke, vrata i dodatke.",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="sr" className="dark">
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <meta name="theme-color" content="#0a0a0a" />
        <meta name="color-scheme" content="dark" />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@graph": [
                {
                  "@type": "WebSite",
                  "@id": `${baseUrl}/#website`,
                  url: baseUrl,
                  name: "Ormani po meri",
                  description:
                    "Dizajnirajte orman po meri online uz besplatan 3D konfigurator.",
                  publisher: { "@id": `${baseUrl}/#organization` },
                  inLanguage: "sr-Latn",
                },
                {
                  "@type": "WebApplication",
                  "@id": `${baseUrl}/design#configurator`,
                  name: "Konfigurator ormana",
                  description:
                    "Besplatan 3D konfigurator za dizajniranje ormana po meri. Birajte dimenzije, materijale, vrata i dodatke.",
                  url: `${baseUrl}/design`,
                  applicationCategory: "DesignApplication",
                  operatingSystem: "All",
                  browserRequirements: "Requires JavaScript and WebGL",
                  offers: {
                    "@type": "Offer",
                    price: "0",
                    priceCurrency: "RSD",
                  },
                  creator: { "@id": `${baseUrl}/#organization` },
                  featureList:
                    "3D vizualizacija, Izbor materijala, Klizna vrata, Fioke, Police, PDF specifikacija",
                  inLanguage: "sr-Latn",
                },
              ],
            }),
          }}
        />
      </head>
      <body className={`${poppins.variable} ${poppins.className} antialiased`}>
        <NextTopLoader color="#7c3aed" showSpinner={false} />
        <PostHogProvider>
          <AuthSessionProvider>{children}</AuthSessionProvider>
        </PostHogProvider>
        <Toaster position="bottom-center" />
      </body>
    </html>
  );
}
