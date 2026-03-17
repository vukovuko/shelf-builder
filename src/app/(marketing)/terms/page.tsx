import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { FooterComplex } from "@/components/smoothui/footer-2";
import { HeroHeader } from "@/components/smoothui/shared";

export const metadata: Metadata = {
  title: "Uslovi korišćenja | Ormani po meri",
  description:
    "Uslovi korišćenja za Ormani po meri konfigurator. Pravila i uslovi za korišćenje naše platforme.",
};

export default function TermsPage() {
  return (
    <div className="relative">
      <HeroHeader />
      <main className="pt-24">
        <section className="py-8 lg:py-14">
          <div className="mx-auto max-w-3xl px-6">
            <Link
              href="/"
              className="mb-8 inline-flex items-center text-sm text-foreground/50 hover:text-primary transition-colors"
            >
              <ArrowLeft className="mr-1 h-4 w-4" />
              Nazad na početnu
            </Link>
            <h1 className="mb-8 text-3xl font-bold text-foreground lg:text-4xl">
              Uslovi korišćenja
            </h1>
            <p className="mb-8 text-foreground/50 text-sm">
              Poslednje ažuriranje: februar 2026.
            </p>
            <nav
              aria-label="Sadržaj"
              className="mb-10 rounded-xl border border-border bg-background/50 p-5"
            >
              <p className="mb-3 font-semibold text-sm text-foreground">
                Sadržaj
              </p>
              <ol className="list-decimal space-y-1.5 pl-5 text-sm">
                <li>
                  <a
                    href="#terms-1"
                    className="text-foreground/70 hover:text-primary transition-colors"
                  >
                    Opšte odredbe
                  </a>
                </li>
                <li>
                  <a
                    href="#terms-2"
                    className="text-foreground/70 hover:text-primary transition-colors"
                  >
                    Korišćenje konfiguratora
                  </a>
                </li>
                <li>
                  <a
                    href="#terms-3"
                    className="text-foreground/70 hover:text-primary transition-colors"
                  >
                    Nalog korisnika
                  </a>
                </li>
                <li>
                  <a
                    href="#terms-4"
                    className="text-foreground/70 hover:text-primary transition-colors"
                  >
                    Porudžbine i cene
                  </a>
                </li>
                <li>
                  <a
                    href="#terms-5"
                    className="text-foreground/70 hover:text-primary transition-colors"
                  >
                    Isporuka i montaža
                  </a>
                </li>
                <li>
                  <a
                    href="#terms-6"
                    className="text-foreground/70 hover:text-primary transition-colors"
                  >
                    Reklamacije i povraćaj
                  </a>
                </li>
                <li>
                  <a
                    href="#terms-7"
                    className="text-foreground/70 hover:text-primary transition-colors"
                  >
                    Intelektualna svojina
                  </a>
                </li>
                <li>
                  <a
                    href="#terms-8"
                    className="text-foreground/70 hover:text-primary transition-colors"
                  >
                    Ograničenje odgovornosti
                  </a>
                </li>
                <li>
                  <a
                    href="#terms-9"
                    className="text-foreground/70 hover:text-primary transition-colors"
                  >
                    Izmene uslova
                  </a>
                </li>
                <li>
                  <a
                    href="#terms-10"
                    className="text-foreground/70 hover:text-primary transition-colors"
                  >
                    Merodavno pravo
                  </a>
                </li>
              </ol>
            </nav>
            <div className="space-y-8 text-foreground/70 leading-relaxed">
              <div id="terms-1">
                <p className="mb-3 text-xl font-semibold text-foreground">
                  1. Opšte odredbe
                </p>
                <p>
                  Korišćenjem platforme Ormani po meri (u daljem tekstu:
                  &quot;platforma&quot;) prihvatate ove uslove korišćenja.
                  Platforma omogućava online konfiguraciju ormana i polica po
                  meri putem 3D{" "}
                  <Link href="/design" className="text-primary hover:underline">
                    konfiguratora
                  </Link>
                  , kao i naručivanje proizvoda na osnovu kreirane
                  konfiguracije.
                </p>
              </div>

              <div id="terms-2">
                <p className="mb-3 text-xl font-semibold text-foreground">
                  2. Korišćenje konfiguratora
                </p>
                <ul className="list-disc space-y-2 pl-6">
                  <li>
                    <Link
                      href="/design"
                      className="text-primary hover:underline"
                    >
                      Konfigurator
                    </Link>{" "}
                    je besplatan alat za dizajniranje ormana po meri.
                  </li>
                  <li>
                    Za čuvanje dizajna i slanje porudžbina potrebna je
                    registracija naloga.
                  </li>
                  <li>
                    Dimenzije, materijali i cene prikazane u konfiguratoru su
                    informativnog karaktera i podložne su potvrdi od strane
                    našeg tima.
                  </li>
                  <li>
                    3D prikaz je približna vizualizacija — boje i teksture
                    materijala mogu se razlikovati od stvarnog proizvoda.
                  </li>
                </ul>
              </div>

              <div id="terms-3">
                <p className="mb-3 text-xl font-semibold text-foreground">
                  3. Nalog korisnika
                </p>
                <ul className="list-disc space-y-2 pl-6">
                  <li>
                    Odgovorni ste za tačnost podataka navedenih prilikom
                    registracije.
                  </li>
                  <li>
                    Odgovorni ste za čuvanje pristupnih podataka svog naloga.
                  </li>
                  <li>
                    Zadržavamo pravo da suspendujemo ili obrišemo naloge koji
                    krše ove uslove.
                  </li>
                  <li>
                    Možete obrisati nalog u bilo kom trenutku putem podešavanja
                    naloga.
                  </li>
                </ul>
              </div>

              <div id="terms-4">
                <p className="mb-3 text-xl font-semibold text-foreground">
                  4. Porudžbine i cene
                </p>
                <ul className="list-disc space-y-2 pl-6">
                  <li>
                    Slanjem porudžbine iz konfiguratora šaljete zahtev za
                    izradu, koji nije obavezujući dok ga naš tim ne potvrdi.
                  </li>
                  <li>
                    Konačna cena se utvrđuje nakon provere specifikacije od
                    strane našeg tima i može se razlikovati od cene prikazane u
                    konfiguratoru.
                  </li>
                  <li>
                    Sve cene su izražene u dinarima (RSD) i uključuju PDV
                    ukoliko nije drugačije naznačeno.
                  </li>
                  <li>
                    Nakon potvrde porudžbine, dobićete detaljnu ponudu sa
                    konačnom cenom i rokovima isporuke.
                  </li>
                </ul>
              </div>

              <div id="terms-5">
                <p className="mb-3 text-xl font-semibold text-foreground">
                  5. Isporuka i montaža
                </p>
                <ul className="list-disc space-y-2 pl-6">
                  <li>
                    Rokovi isporuke zavise od kompleksnosti porudžbine i
                    dostupnosti materijala.
                  </li>
                  <li>
                    Okvirni rok isporuke biće naveden u potvrdi porudžbine.
                  </li>
                  <li>
                    Montaža je dostupna kao dodatna usluga i njena cena zavisi
                    od lokacije i složenosti posla.
                  </li>
                </ul>
              </div>

              <div id="terms-6">
                <p className="mb-3 text-xl font-semibold text-foreground">
                  6. Reklamacije i povraćaj
                </p>
                <ul className="list-disc space-y-2 pl-6">
                  <li>
                    S obzirom da su proizvodi izrađeni po meri, povraćaj nije
                    moguć osim u slučaju grešaka u izradi.
                  </li>
                  <li>
                    Reklamacije se mogu podneti u roku od 14 dana od prijema
                    proizvoda.
                  </li>
                  <li>
                    Reklamacija mora sadržati opis problema i fotografije —
                    možete je poslati putem{" "}
                    <Link
                      href="/contact"
                      className="text-primary hover:underline"
                    >
                      kontakt forme
                    </Link>
                    .
                  </li>
                  <li>
                    U slučaju opravdane reklamacije, obavezujemo se da otklonimo
                    nedostatak u razumnom roku ili ponudimo adekvatnu zamenu.
                  </li>
                </ul>
              </div>

              <div id="terms-7">
                <p className="mb-3 text-xl font-semibold text-foreground">
                  7. Intelektualna svojina
                </p>
                <p>
                  Sav sadržaj na platformi, uključujući dizajn, kod,
                  vizualizacije i tekstove, vlasništvo je Ormani po meri i
                  zaštićen je zakonom o autorskim pravima. Konfiguracije koje
                  kreirate na platformi su vaše vlasništvo i možete ih koristiti
                  u bilo koje svrhe.
                </p>
              </div>

              <div id="terms-8">
                <p className="mb-3 text-xl font-semibold text-foreground">
                  8. Ograničenje odgovornosti
                </p>
                <ul className="list-disc space-y-2 pl-6">
                  <li>
                    Platforma je dostupna &quot;kakva jeste&quot; — ne
                    garantujemo neprekidan rad bez grešaka.
                  </li>
                  <li>
                    Ne odgovaramo za gubitak podataka usled tehničkih problema
                    van naše kontrole.
                  </li>
                  <li>
                    Preporučujemo preuzimanje PDF specifikacija za čuvanje
                    važnih konfiguracija.
                  </li>
                </ul>
              </div>

              <div id="terms-9">
                <p className="mb-3 text-xl font-semibold text-foreground">
                  9. Izmene uslova
                </p>
                <p>
                  Zadržavamo pravo da izmenimo ove uslove korišćenja. O
                  značajnim izmenama ćemo vas obavestiti putem emaila ili
                  obaveštenja na platformi. Nastavak korišćenja platforme nakon
                  izmena podrazumeva prihvatanje novih uslova.
                </p>
              </div>

              <div id="terms-10">
                <p className="mb-3 text-xl font-semibold text-foreground">
                  10. Merodavno pravo
                </p>
                <p>
                  Na ove uslove korišćenja primenjuje se zakon Republike Srbije.
                  Za sve sporove nadležan je sud u Beogradu.
                </p>
              </div>
            </div>
          </div>
        </section>
      </main>
      <FooterComplex />
    </div>
  );
}
