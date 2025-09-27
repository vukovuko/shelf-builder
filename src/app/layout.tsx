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
  title: "Shelf Builder",
  description: "Design your custom shelf.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark">
      <body className={`${poppins.variable} ${poppins.className} antialiased`}>
  <AuthSessionProvider>{children}</AuthSessionProvider>
        <Toaster position="bottom-center" />
      </body>
    </html>
  );
}
