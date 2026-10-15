import { Mail, Phone } from "lucide-react";
import type { Metadata } from "next";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { COMPANY_CONTACT, COMPANY_PHONE_HREF } from "@/lib/company-contact";
import { COMPANY_SOCIALS } from "@/lib/company-socials";
import { SocialIcon } from "@/components/SocialIcons";
import { FooterComplex } from "@/components/smoothui/footer-2";
import { HeroHeader } from "@/components/smoothui/shared";
import { PublicContactForm } from "./PublicContactForm";

export const metadata: Metadata = {
  title: "Kontakt | Ormani po Meri — Pošaljite Nam Poruku",
  description: `Pozovite nas na ${COMPANY_CONTACT.phone} (${COMPANY_CONTACT.hours}) ili pišite na ${COMPANY_CONTACT.email} za pitanja o ormanima po meri: mere, materijali, cene, izrada, montaža i dostava.`,
};

const cardClass = "rounded-xl border border-border bg-card p-5";
const labelClass =
  "mb-2 font-semibold text-foreground/60 text-xs uppercase tracking-wide";

export default async function ContactPage() {
  const session = await auth.api.getSession({ headers: await headers() });

  return (
    <div className="relative">
      <HeroHeader />
      <main className="pt-24">
        <section className="py-8 lg:py-14">
          <div className="mx-auto max-w-3xl px-6">
            <h1 className="mb-8 text-3xl font-bold text-foreground lg:text-4xl">
              Kontakt
            </h1>

            <div className="mb-12 grid max-w-2xl gap-4 sm:grid-cols-2">
              <div className={cardClass}>
                <p className={labelClass}>Telefon</p>
                <a
                  className="inline-flex items-center gap-2 font-medium text-foreground transition-colors hover:text-primary"
                  href={COMPANY_PHONE_HREF}
                >
                  <Phone aria-hidden="true" className="size-4" />
                  {COMPANY_CONTACT.phone}
                </a>
                <p className="mt-1 text-foreground/70 text-sm">
                  Radno vreme {COMPANY_CONTACT.hours}
                </p>
              </div>
              <div className={cardClass}>
                <p className={labelClass}>Email</p>
                <a
                  className="inline-flex items-center gap-2 break-words font-medium text-foreground transition-colors hover:text-primary"
                  href={`mailto:${COMPANY_CONTACT.email}`}
                >
                  <Mail aria-hidden="true" className="size-4 shrink-0" />
                  {COMPANY_CONTACT.email}
                </a>
              </div>
              <div className="flex items-center justify-between gap-4 rounded-xl border border-border bg-card py-2 pr-2 pl-5 sm:col-span-2">
                <p className="font-semibold text-foreground/60 text-xs uppercase tracking-wide">
                  Pratite nas
                </p>
                <div className="flex">
                  {COMPANY_SOCIALS.map((item) => (
                    <a
                      key={item.platform}
                      aria-label={`${item.label} (otvara se u novom prozoru)`}
                      className="inline-flex min-h-[44px] min-w-[44px] items-center justify-center text-foreground/70 transition-colors hover:text-primary"
                      href={item.url}
                      rel="noopener noreferrer"
                      target="_blank"
                    >
                      <SocialIcon platform={item.platform} />
                    </a>
                  ))}
                </div>
              </div>
            </div>

            <h2 className="mb-2 font-semibold text-foreground text-xl">
              Pošaljite poruku
            </h2>
            <p className="mb-6 text-foreground/70">
              Javićemo vam se u najkraćem mogućem roku.
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
