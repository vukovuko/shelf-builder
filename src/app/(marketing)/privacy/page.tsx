import type { Metadata } from "next";
import { FooterComplex } from "@/components/smoothui/footer-2";
import { HeroHeader } from "@/components/smoothui/shared";

export const metadata: Metadata = {
  title: "Politika privatnosti | Ormani po meri",
  description:
    "Politika privatnosti za Ormani po meri konfigurator. Saznajte kako prikupljamo, koristimo i štitimo vaše lične podatke.",
};

export default function PrivacyPage() {
  return (
    <div className="relative">
      <HeroHeader />
      <main className="pt-24">
        <section className="py-10 lg:py-20">
          <div className="mx-auto max-w-3xl px-6">
            <h1 className="mb-8 text-3xl font-bold text-foreground lg:text-4xl">
              Politika privatnosti
            </h1>
            <p className="mb-8 text-foreground/50 text-sm">
              Poslednje ažuriranje: februar 2026.
            </p>
            <div className="space-y-8 text-foreground/70 leading-relaxed">
              <div>
                <h2 className="mb-3 text-xl font-semibold text-foreground">
                  1. Uvod
                </h2>
                <p>
                  Ormani po meri (u daljem tekstu: &quot;mi&quot;,
                  &quot;nas&quot;, &quot;naš&quot;) posvećen je zaštiti vaše
                  privatnosti. Ova politika objašnjava kako prikupljamo,
                  koristimo i štitimo vaše lične podatke kada koristite naš
                  online konfigurator za ormare i police po meri.
                </p>
              </div>

              <div>
                <h2 className="mb-3 text-xl font-semibold text-foreground">
                  2. Podaci koje prikupljamo
                </h2>
                <p className="mb-3">
                  Prilikom korišćenja naše platforme, možemo prikupljati sledeće
                  podatke:
                </p>
                <ul className="list-disc space-y-2 pl-6">
                  <li>
                    <strong className="text-foreground">
                      Podaci o nalogu:
                    </strong>{" "}
                    ime, email adresa i lozinka prilikom registracije.
                  </li>
                  <li>
                    <strong className="text-foreground">
                      Podaci o konfiguraciji:
                    </strong>{" "}
                    dimenzije, materijali, dodaci i ostale opcije koje izaberete
                    u konfiguratoru.
                  </li>
                  <li>
                    <strong className="text-foreground">Kontakt podaci:</strong>{" "}
                    ime, email i broj telefona kada nas kontaktirate putem
                    kontakt forme.
                  </li>
                  <li>
                    <strong className="text-foreground">
                      Tehnički podaci:
                    </strong>{" "}
                    IP adresa, tip pregledača, operativni sistem i podaci o
                    korišćenju sajta putem analitičkih alata.
                  </li>
                </ul>
              </div>

              <div>
                <h2 className="mb-3 text-xl font-semibold text-foreground">
                  3. Kako koristimo vaše podatke
                </h2>
                <ul className="list-disc space-y-2 pl-6">
                  <li>
                    Za kreiranje i upravljanje vašim nalogom i sačuvanim
                    dizajnima ormana.
                  </li>
                  <li>
                    Za generisanje PDF specifikacija i tehničkih crteža na
                    osnovu vaše konfiguracije.
                  </li>
                  <li>
                    Za obradu porudžbina i komunikaciju u vezi sa vašim
                    narudžbinama.
                  </li>
                  <li>
                    Za slanje obaveštenja o novim materijalima i akcijama (samo
                    uz vašu saglasnost).
                  </li>
                  <li>
                    Za poboljšanje funkcionalnosti konfiguratora i korisničkog
                    iskustva.
                  </li>
                </ul>
              </div>

              <div>
                <h2 className="mb-3 text-xl font-semibold text-foreground">
                  4. Čuvanje podataka
                </h2>
                <p>
                  Vaši podaci se čuvaju na sigurnim serverima. Konfiguracije
                  ormana i nalog podatke čuvamo sve dok imate aktivan nalog.
                  Možete zatražiti brisanje naloga i svih povezanih podataka u
                  bilo kom trenutku putem podešavanja naloga ili kontakt forme.
                </p>
              </div>

              <div>
                <h2 className="mb-3 text-xl font-semibold text-foreground">
                  5. Deljenje podataka
                </h2>
                <p className="mb-3">
                  Ne prodajemo vaše lične podatke trećim stranama. Podatke
                  možemo deliti samo u sledećim slučajevima:
                </p>
                <ul className="list-disc space-y-2 pl-6">
                  <li>
                    Sa dobavljačima koji učestvuju u izradi vašeg ormana (samo
                    tehnička specifikacija, bez ličnih podataka).
                  </li>
                  <li>
                    Sa pružaocima usluga koje koristimo za rad platforme
                    (hosting, email, analitika) — koji su obavezani ugovorima o
                    zaštiti podataka.
                  </li>
                  <li>
                    Kada je to zakonski obavezno ili na zahtev nadležnih organa.
                  </li>
                </ul>
              </div>

              <div>
                <h2 className="mb-3 text-xl font-semibold text-foreground">
                  6. Kolačići (Cookies)
                </h2>
                <p>
                  Koristimo funkcionalne kolačiće za rad platforme (sesija,
                  autentifikacija) i analitičke kolačiće za razumevanje
                  korišćenja sajta. Možete podesiti pregledač da odbija
                  kolačiće, ali to može uticati na funkcionalnost konfiguratora.
                </p>
              </div>

              <div>
                <h2 className="mb-3 text-xl font-semibold text-foreground">
                  7. Vaša prava
                </h2>
                <p className="mb-3">Imate pravo da:</p>
                <ul className="list-disc space-y-2 pl-6">
                  <li>Pristupite svojim ličnim podacima.</li>
                  <li>Ispravite netačne podatke.</li>
                  <li>Zatražite brisanje vaših podataka.</li>
                  <li>Povučete saglasnost za primanje obaveštenja.</li>
                  <li>
                    Zatražite prenos vaših podataka u strukturisanom formatu.
                  </li>
                </ul>
              </div>

              <div>
                <h2 className="mb-3 text-xl font-semibold text-foreground">
                  8. Bezbednost
                </h2>
                <p>
                  Primenjujemo tehničke i organizacione mere zaštite uključujući
                  enkripciju podataka, sigurnu autentifikaciju i redovno
                  ažuriranje sistema. Uprkos našim naporima, nijedan sistem
                  prenosa podataka putem interneta nije 100% siguran.
                </p>
              </div>

              <div>
                <h2 className="mb-3 text-xl font-semibold text-foreground">
                  9. Izmene politike
                </h2>
                <p>
                  Zadržavamo pravo da ažuriramo ovu politiku privatnosti. O
                  značajnim izmenama ćemo vas obavestiti putem emaila ili
                  obaveštenja na platformi. Datum poslednjeg ažuriranja je
                  naveden na vrhu stranice.
                </p>
              </div>

              <div>
                <h2 className="mb-3 text-xl font-semibold text-foreground">
                  10. Kontakt
                </h2>
                <p>
                  Za sva pitanja u vezi sa zaštitom podataka, možete nas
                  kontaktirati putem kontakt forme na sajtu ili putem emaila.
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
