export interface BlogPost {
  slug: string;
  title: string;
  description: string;
  date: string;
  readTime: string;
  content: string;
}

export const blogPosts: BlogPost[] = [
  {
    slug: "kako-izabrati-orman-po-meri",
    title: "Kako izabrati savršen orman po meri za vaš prostor",
    description:
      "Vodič kroz ključne faktore pri izboru ormana po meri — od merenja prostora do izbora materijala i dodataka.",
    date: "2026-02-25",
    readTime: "5 min",
    content: `Orman po meri je jedna od najboljih investicija u vaš dom. Za razliku od gotovih ormana, orman po meri savršeno koristi svaki centimetar prostora i prilagođen je vašim potrebama. Evo šta treba da znate pre nego što počnete.

## 1. Izmerite prostor

Pre svega, precizno izmerite prostor gde planirate orman:

- **Širina** — izmerite na tri mesta: pri vrhu, sredini i dnu zida. Koristite najmanju meru.
- **Visina** — izmerite od poda do plafona na levoj i desnoj strani. Plafoni nisu uvek ravni.
- **Dubina** — odlučite koliko duboko orman može da ide, uzimajući u obzir prolaz i vrata sobe.

Naš konfigurator podržava širinu od 40cm do 400cm, visinu od 60cm do 260cm i dubinu od 30cm do 80cm.

## 2. Odredite broj kolona

Kolone su vertikalne sekcije ormana odvojene pregradama. Broj kolona zavisi od širine ormana i načina korišćenja:

- **Uska kolona (30-50cm)** — idealna za police ili fioke.
- **Srednja kolona (50-70cm)** — univerzalna, dobra za kombinaciju polica i šipke za vešalice.
- **Široka kolona (70-100cm)** — odlična za šipku za vešalice i duge stvari.

U konfiguratoru možete prevlačenjem podesiti širinu svake kolone individualno.

## 3. Izaberite materijal

Materijal utiče na izgled, trajnost i cenu ormana. Nudimo preko 30 materijala:

- **Iveral (iverica)** — najpopularniji izbor. Dostupan u mnogo dekora, od jednobojnih do imitacije drveta. Odličan odnos cene i kvaliteta.
- **MDF (medijapan)** — glatka površina, idealan za lakiranje. Nešto skuplji od iverala.
- **Furnir** — tanak sloj pravog drveta na podlozi. Prirodan izgled sa stabilnošću industrijske ploče.
- **Masivno drvo** — premium opcija za one koji žele autentičnost i trajnost.

## 4. Razmislite o vratima

Tip vrata značajno utiče na funkcionalnost i estetiku:

- **Krilna vrata** — klasičan izbor. Mogu biti jedna ili dupla. Zahtevaju prostor za otvaranje ispred ormana.
- **Klizna vrata** — štede prostor jer klize paralelno sa ormanom. Idealna za manje prostorije i hodnike. U konfiguratoru se automatski raspoređuju po širini.
- **Bez vrata** — otvoren orman ili garderober. Moderan izgled, ali zahteva više održavanja.

## 5. Dodajte unutrašnju opremu

Unutrašnjost ormana prilagodite vašim potrebama:

- **Police** — za odeću na preklop, posteljinu, kutije.
- **Fioke** — za sitnice, donji veš, aksesoar. Mogu se postaviti u bilo kojoj koloni.
- **Šipka za vešalice** — za košulje, haljine, jakne. Postavlja se na vrh kolone.
- **Vertikalni pregradnik** — deli kolonu na dva dela za bolje organizovanje.
- **LED osvetljenje** — praktičan dodatak za bolju vidljivost.

## Sledeći korak

Najlakši način da dizajnirate orman po meri je da pokrenete naš [besplatni 3D konfigurator](/design). Za par minuta možete kreirati orman po vašim merama, izabrati materijale i videti rezultat uživo u 3D prikazu. Na kraju dobijate detaljnu specifikaciju sa cenama.`,
  },
];

export function getBlogPost(slug: string): BlogPost | undefined {
  return blogPosts.find((post) => post.slug === slug);
}

export function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("sr-Latn-RS", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}
