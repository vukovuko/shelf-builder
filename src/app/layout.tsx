import type { Metadata } from "next";
import { Poppins } from "next/font/google";
import { Toaster } from "@/components/ui/sonner";
import "./globals.css";
import { AuthSessionProvider } from "@/components/AuthSessionProvider";

const poppins = Poppins({
  subsets: ["latin"],
  weight: ["100", "200", "300", "400", "500", "600", "700", "800", "900"],
  style: ["normal"],
  variable: "--font-poppins",
});

export const metadata: Metadata = {
  title: "Ormani po meri - Dizajnirajte Vaš Orman po Želji",
  description:
    "Profesionalni 3D konfigurator za dizajniranje ormana i polica. Izaberite dimenzije, materijale, fioke i vrata. Preuzmi specifikaciju u PDF formatu.",
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
  openGraph: {
    type: "website",
    siteName: "Ormani po meri",
    title: "Ormani po meri - Dizajnirajte Vaš Orman po Želji",
    description:
      "Profesionalni 3D konfigurator za dizajniranje ormana i polica",
    locale: "sr_RS",
  },
  twitter: {
    card: "summary_large_image",
    title: "Ormani po meri - Dizajnirajte Vaš Orman po Želji",
    description:
      "Profesionalni 3D konfigurator za dizajniranje ormana i polica",
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
      </head>
      <body className={`${poppins.variable} ${poppins.className} antialiased`}>
        <AuthSessionProvider>{children}</AuthSessionProvider>
        <Toaster position="bottom-center" />
      </body>
    </html>
  );
}
