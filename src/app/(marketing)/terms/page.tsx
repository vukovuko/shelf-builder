import type { Metadata } from "next";
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
        <section className="py-10 lg:py-20">
          <div className="mx-auto max-w-3xl px-6">
            <h1 className="mb-8 text-3xl font-bold text-foreground lg:text-4xl">
              Uslovi korišćenja
            </h1>
            <p className="mb-8 text-foreground/50 text-sm">
              Poslednje ažuriranje: februar 2026.
            </p>
            <div className="space-y-8 text-foreground/70 leading-relaxed">
              <div>
                <h2 className="mb-3 text-xl font-semibold text-foreground">
                  1. Opšte odredbe
                </h2>
                <p>
                  Korišćenjem platforme Ormani po meri (u daljem tekstu:
                  &quot;platforma&quot;) prihvatate ove uslove korišćenja.
                  Platforma omogućava online konfiguraciju ormana i polica po
                  meri putem 3D konfiguratora, kao i naručivanje proizvoda na
                  osnovu kreirane konfiguracije.
                </p>
              </div>

              <div>
                <h2 className="mb-3 text-xl font-semibold text-foreground">
                  2. Korišćenje konfiguratora
                </h2>
                <ul className="list-disc space-y-2 pl-6">
                  <li>
                    Konfigurator je besplatan alat za dizajniranje ormana po
                    meri.
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

              <div>
                <h2 className="mb-3 text-xl font-semibold text-foreground">
                  3. Nalog korisnika
                </h2>
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

              <div>
                <h2 className="mb-3 text-xl font-semibold text-foreground">
                  4. Porudžbine i cene
                </h2>
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

              <div>
                <h2 className="mb-3 text-xl font-semibold text-foreground">
                  5. Isporuka i montaža
                </h2>
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

              <div>
                <h2 className="mb-3 text-xl font-semibold text-foreground">
                  6. Reklamacije i povraćaj
                </h2>
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
                    možete je poslati putem kontakt forme.
                  </li>
                  <li>
                    U slučaju opravdane reklamacije, obavezujemo se da otklonimo
                    nedostatak u razumnom roku ili ponudimo adekvatnu zamenu.
                  </li>
                </ul>
              </div>

              <div>
                <h2 className="mb-3 text-xl font-semibold text-foreground">
                  7. Intelektualna svojina
                </h2>
                <p>
                  Sav sadržaj na platformi, uključujući dizajn, kod,
                  vizualizacije i tekstove, vlasništvo je Ormani po meri i
                  zaštićen je zakonom o autorskim pravima. Konfiguracije koje
                  kreirate na platformi su vaše vlasništvo i možete ih koristiti
                  u bilo koje svrhe.
                </p>
              </div>

              <div>
                <h2 className="mb-3 text-xl font-semibold text-foreground">
                  8. Ograničenje odgovornosti
                </h2>
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

              <div>
                <h2 className="mb-3 text-xl font-semibold text-foreground">
                  9. Izmene uslova
                </h2>
                <p>
                  Zadržavamo pravo da izmenimo ove uslove korišćenja. O
                  značajnim izmenama ćemo vas obavestiti putem emaila ili
                  obaveštenja na platformi. Nastavak korišćenja platforme nakon
                  izmena podrazumeva prihvatanje novih uslova.
                </p>
              </div>

              <div>
                <h2 className="mb-3 text-xl font-semibold text-foreground">
                  10. Merodavno pravo
                </h2>
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
