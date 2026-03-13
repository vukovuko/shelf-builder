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
      "Kompletni vodič za izbor ormana po meri — kako izmeriti prostor, odrediti broj kolona, izabrati materijal, vrata i unutrašnju opremu za savršen orman.",
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
  {
    slug: "orman-po-meri-za-mali-stan",
    title: "Orman po meri za mali stan: 5 pametnih rešenja za više prostora",
    description:
      "Živite u manjem stanu? Otkrijte kako orman po meri rešava problem skladištenja — konkretni primeri za hodnike, spavaće sobe i niše sa dimenzijama.",
    date: "2026-03-13",
    readTime: "7 min",
    content: `Mali stan ne znači da morate živeti u haosu. Upravo suprotno — kada je prostor ograničen, pametno skladištenje postaje ključno. Gotovi ormani retko odgovaraju neobičnim dimenzijama malih stanova, ali orman po meri može da pretvori svaku nišu, hodnik ili ćošak u funkcionalan garderober.

## Zašto gotov orman ne radi u malom stanu

Standardni ormani dolaze u fiksnim dimenzijama — obično 60cm dubine i 120, 150 ili 200cm širine. Problem nastaje kada:

- **Hodnik je širok samo 90cm** — gotov orman od 60cm dubine ostavlja samo 30cm za prolaz, što je neupotrebljivo.
- **Niša pored vrata je 85cm široka** — ne postoji gotov orman te dimenzije. Kupite manji i gubite prostor, ili veći koji ne staje.
- **Plafoni su 240cm, a orman visok 200cm** — 40cm iznad ormana skuplja prašinu umesto da skladišti stvari.

Orman po meri popunjava prostor od poda do plafona i od zida do zida. Nema mrtvih zona, nema neiskorišćenih centimetara.

## 1. Hodnik: klizna vrata i plitki orman

Hodnik je najčešće zapostavljen prostor u stanu, a zapravo je idealan za garderobni orman.

**Primer konfiguracije:**
- Širina: 180cm (ceo zid hodnika)
- Visina: 240cm (do plafona)
- Dubina: **45cm** (umesto standardnih 60cm — dovoljno za vešalice postavljene frontalno)

**Raspored unutrašnjosti:**
- Leva kolona (60cm) — šipka za vešalice + police iznad za kape i šalove
- Srednja kolona (60cm) — 4 fioke za rukavice, ključeve, maramice + police iznad
- Desna kolona (60cm) — police za cipele (razmak 15–20cm između polica)

**Ključni detalj:** Klizna vrata su obavezna u hodniku jer se krilna vrata ne mogu otvoriti u uskom prolazu. Klizna vrata ne zahtevaju nikakav prostor ispred ormana.

Ovaj hodnik-orman možete dizajnirati u [našem konfiguratoru](/design) — postavite dubinu na 45cm, dodajte 3 kolone i klizna vrata.

## 2. Spavaća soba: ceo zid umesto komode

Umesto da imate orman OD 150cm i komodu PORED njega, napravite jedan orman preko celog zida. Zauzima istu dubinu, a dobijate duplo više prostora.

**Primer konfiguracije:**
- Širina: 300cm (ceo zid)
- Visina: 250cm
- Dubina: 60cm

**Raspored unutrašnjosti:**
- Kolona 1 (80cm) — šipka za vešalice za duge komade (haljine, kaputi)
- Kolona 2 (80cm) — dupla šipka (gornja na 170cm, donja na 90cm) za košulje i pantalone
- Kolona 3 (70cm) — 5 fioka od dna + police iznad za džempere
- Kolona 4 (70cm) — police za posteljinu, peškire i sezonsku odeću

**Rezultat:** Komoda vam više ne treba. Fioke u ormanu preuzimaju njenu funkciju, a pod sobe je slobodan. U maloj spavaćoj sobi to znači prostor za noćni stočić ili radni sto.

## 3. Niša pored vrata: iskoristite „mrtav" prostor

Skoro svaki stan ima nišu ili udubljenje pored ulaznih vrata, u hodniku ili spavaćoj sobi. Ovi prostori su obično široki 70–120cm i savršeni su za ugrađeni orman.

**Primer konfiguracije:**
- Širina: 90cm (koliko je niša široka)
- Visina: 240cm
- Dubina: 50cm

**Raspored unutrašnjosti:**
- Gornji deo (iznad 180cm) — 2 police za sezonsku odeću i kutije
- Srednji deo — šipka za vešalice za svakodnevnu odeću
- Donji deo — 3 fioke za donji veš, čarape i aksesoar

**Zašto radi:** Niša izgleda kao da je orman uvek bio tu — ugrađen u zid, bez isturenih ivica. Dodajte vrata u boji zida i orman postaje nevidljiv.

## 4. Dnevna soba: police umesto klasičnog ormana

U dnevnoj sobi vam ne treba garderobni orman, ali vam treba skladište za knjige, dokumente, tehniku i dekoraciju. Orman po meri sa policama zamenjuje 3–4 komada nameštaja.

**Primer konfiguracije:**
- Širina: 200cm
- Visina: 220cm
- Dubina: **35cm** (plići orman, dovoljno za knjige i kutije)

**Raspored unutrašnjosti:**
- 4 kolone po 50cm
- Svaka kolona: 5–6 polica na različitim razmacima
- Donje 2 kolone: vrata (da sakrijete papire i stvari koje nisu za oči)
- Gornje 2 kolone: otvorene police za knjige i dekoraciju

Ovo je idealno rešenje za studio apartmane gde dnevna soba služi i kao radna soba.

## 5. Dečija soba: orman koji raste sa detetom

Deca rastu, ali orman ne mora da se menja svake godine. Trik je u prilagodljivom rasporedu:

**Primer za dete 3–6 godina:**
- Donja šipka na 100cm — dete samo vadi odeću
- Gornja zona — roditeljski pristup za sezonsku odeću
- Fioke na dnu — igračke i aksesoar

**Isti orman za dete 10+ godina:**
- Šipka se pomeri na standardnu visinu (170cm)
- Dodaju se police za školski pribor
- Fioke ostaju za odeću

U konfiguratoru dizajnirate raspored za danas, a sutra samo pomerite police i šipku — konstrukcija ormana ostaje ista.

## Koliko košta orman po meri za mali stan?

Cena zavisi od dimenzija, materijala i dodataka. Ali evo grubog okvira:

- **Manji orman (90×240cm)** — idealan za niše, ekonomičan
- **Srednji orman (180×240cm)** — hodnik ili manja soba
- **Orman preko celog zida (300×250cm)** — zamenjuje sav ostali nameštaj u sobi

Najlakši način da saznate tačnu cenu: [otvorite konfigurator](/design), unesite svoje dimenzije, izaberite materijal i dodajte opremu. Cena se računa automatski u realnom vremenu dok dizajnirate.

## Zaključak

Mali stan zahteva pametan pristup nameštaju. Orman po meri nije luksuz — u malom stanu je praktično neophodnost. Svaki centimetar se računa, i razlika između haotičnog i organizovanog prostora često leži u jednom dobro isplaniranom ormanu.

Započnite dizajn u [3D konfiguratoru](/design) — besplatno je, traje 5 minuta, i na kraju dobijate kompletnu specifikaciju sa cenama.`,
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
