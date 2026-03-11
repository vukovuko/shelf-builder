import type { SocialLink } from "@/components/SocialIcons";

export const blogAuthor = {
  name: "Vuko Vukašinović",
  image: "/authors/Vuko-Vukašinović.png",
  bio: "Full-stack developer sa strašću za dizajn i moderne web tehnologije. Kreira alate koji pojednostavljuju proces uređenja doma.",
  socials: [
    {
      platform: "linkedin",
      label: "LinkedIn",
      url: "https://www.linkedin.com/in/vuko-vukasinovic/",
    },
    {
      platform: "instagram",
      label: "Instagram",
      url: "https://www.instagram.com/vuko_vukasinovic/",
    },
    {
      platform: "facebook",
      label: "Facebook",
      url: "https://www.facebook.com/vuko.vukasinovic/",
    },
  ] satisfies SocialLink[],
};

export interface BlogPost {
  slug: string;
  title: string;
  description: string;
  date: string;
  readTime: string;
  image?: string;
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
  {
    slug: "organizacija-ormana-saveti",
    title: "Kako organizovati orman: 7 praktičnih saveta za više prostora",
    description:
      "Naučite kako da maksimalno iskoristite prostor u ormanu. Praktični saveti za raspored polica, fioka i vešalica koji donose red i preglednost.",
    date: "2026-03-10",
    readTime: "6 min",
    content: `Kupili ste orman, ali odeća se i dalje gomila? Problem obično nije u veličini ormana, već u organizaciji. Sa pravim rasporedom unutrašnjosti, čak i manji orman može da primi iznenađujuće mnogo stvari — i da sve bude na dohvat ruke.

## 1. Podelite orman na zone

Efikasna organizacija počinje podelom ormana na zone prema učestalosti korišćenja:

- **Zona na dohvat ruke (90–170cm)** — svakodnevna odeća. Ovde idu košulje, majice, pantalone i haljine koje nosite redovno.
- **Gornja zona (iznad 170cm)** — sezonska odeća i stvari koje ređe koristite. Zimske jakne leti, letnje haljine zimi, putni koferi.
- **Donja zona (ispod 90cm)** — cipele, teže stvari i fioke za donji veš i aksesoar.

U našem konfiguratoru ovo možete postići kombinacijom polica, šipke za vešalice i fioka u različitim kolonama.

## 2. Koristite vertikalni prostor

Većina ljudi ne koristi gornji deo ormana dovoljno. Evo kako da to promenite:

- **Dupla šipka** — umesto jedne šipke na 170cm, stavite dve: jednu na 170cm za duže komade i jednu na 100cm za košulje i sakoe. Kolona širine 60–80cm je idealna za ovo.
- **Police do vrha** — dodajte police iznad šipke za vešalice. Korpe i kutije na policama čuvaju sezonsku odeću uredno.
- **Vertikalni pregradnik** — deli široku kolonu na dva dela za bolje razdvajanje kategorija odeće.

## 3. Fioke su vaš najbolji prijatelj

Fioke čuvaju stvari preglednim i čistim. Za razliku od polica gde se gomile odeće mešaju, fioke imaju jasne granice:

- **Donji veš i čarape** — jedna do dve fioke su dovoljne za većinu ljudi.
- **Majice i preklop** — umesto gomile na polici, složite majice u fioke vertikalnim pregibom (KonMari metod).
- **Aksesoar** — kravate, kaiševi, nakit — sve na jednom mestu.

Preporučujemo 3–5 fioka na dnu jedne kolone. Naš konfigurator automatski raspoređuje fioke sa optimalnim razmakom.

## 4. Prilagodite police razmacima

Greška koju mnogi prave: police na jednakim razmacima. Umesto toga, prilagodite razmak sadržaju:

- **25–30cm razmak** — za složenu odeću (majice, džemperi).
- **35–40cm razmak** — za posteljinu, peškire, torbe.
- **15–20cm razmak** — za cipele (idealno u donjem delu).

U konfiguratoru možete dodavati police u svakom odeljku i rasporediti ih prema potrebi.

## 5. Odvojite svakodnevno od sezonskog

Jedan od najvažnijih principa organizacije: ne trpajte sve u isti prostor.

- **Prednja strana ormana** — odeća za trenutnu sezonu.
- **Gornje police** — vansezonska odeća u vakuum kesama ili kutijama.
- **Zasebna kolona** — ako imate prostora, posvetite jednu kolonu isključivo sezonskim stvarima i rotiranje radite dva puta godišnje.

## 6. Iskoristite vrata ormana

Unutrašnja strana vrata je često zapostavljen prostor:

- **Kukice** — za kaiševi, torbice, šalove.
- **Organajzeri koji vise** — za cipele, aksesoar ili sredstva za čišćenje.
- **Ogledalo** — praktično i vizuelno povećava prostor.

Ovo važi za krilna vrata. Ako birate klizna vrata, imajte u vidu da nemaju unutrašnji prostor za dodatke.

## 7. Održavajte sistem

Najbolja organizacija ne vredi ako je ne održavate. Jednostavna pravila:

- **Pravilo „jedna unutra, jedna napolje"** — kad kupite nešto novo, odložite nešto staro.
- **Sezonska revizija** — dva puta godišnje pregledajte sadržaj i odložite ono što ne nosite.
- **Vraćajte na mesto** — 30 sekundi da vratite stvar na mesto je bolje od sata organizovanja vikendom.

## Dizajnirajte orman koji radi za vas

Organizacija počinje od dobrog dizajna. Naš [besplatni 3D konfigurator](/design) vam omogućava da isplanirate svaku kolonu, policu i fioku pre izrade. Vidite rezultat uživo u 3D prikazu, menjajte raspored dok ne pronađete savršenu kombinaciju — i naručite orman koji je od prvog dana organizovan.`,
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
