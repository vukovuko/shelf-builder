import type { Metadata } from "next";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { FooterComplex } from "@/components/smoothui/footer-2";
import { HeroHeader } from "@/components/smoothui/shared";
import { PublicContactForm } from "./PublicContactForm";

export const metadata: Metadata = {
  title: "Kontakt | Ormani po meri",
  description:
    "Kontaktirajte nas za sva pitanja o ormanima po meri, konfiguratoru, materijalima, cenama i isporuci.",
};

export default async function ContactPage() {
  const session = await auth.api.getSession({ headers: await headers() });

  return (
    <div className="relative">
      <HeroHeader />
      <main className="pt-24">
        <section className="py-10 lg:py-20">
          <div className="mx-auto max-w-3xl px-6">
            <h1 className="mb-4 text-3xl font-bold text-foreground lg:text-4xl">
              Kontakt
            </h1>
            <p className="mb-8 text-lg text-foreground/70">
              Imate pitanje ili sugestiju? Pošaljite nam poruku i javićemo vam
              se u najkraćem mogućem roku.
            </p>
            <PublicContactForm
              userName={session?.user?.name ?? ""}
              userEmail={session?.user?.email ?? ""}
            />
          </div>
        </section>
      </main>
      <FooterComplex />
    </div>
  );
}
