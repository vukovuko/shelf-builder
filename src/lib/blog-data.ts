import type { SocialLink } from "@/components/SocialIcons";
import { DESIGN_IMPORT_ADMIN_ONLY } from "@/lib/design-import/config";

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

// Shown once sketch upload is open to customers (design-import/config).
const sketchUploadSection = DESIGN_IMPORT_ADMIN_ONLY
  ? ""
  : `Ako ste prijavljeni, skicu možete i da uslikate i učitate pravo u [konfigurator](/design). Prepoznaje kolone, police, fioke, šipke i vrata, a mere uzima ako ste ih napisali na papiru. Ono što ne može da se izradi uskladi sa pravilima izrade i pokaže vam šta je promenio.

`;

// Shown once the written-description import is open to customers.
const descriptionSection = DESIGN_IMPORT_ADMIN_ONLY
  ? ""
  : `Ako ste prijavljeni, opis možete da upišete i pravo u [konfigurator](/design), u polje "Ili opišite orman". Orman se napravi za nekoliko sekundi, a opis može biti na srpskom ili engleskom. Ono što ne može da se izradi konfigurator uskladi sa pravilima izrade i pokaže vam šta je promenio.

`;

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

Materijal utiče na izgled, trajnost i cenu ormana. U konfiguratoru birate između više od 500 dekora:

- **Iveral (iverica)** — najpopularniji izbor. Dostupan u mnogo dekora, od jednobojnih do imitacije drveta. Odličan odnos cene i kvaliteta.
- **MDF (medijapan)** — glatka površina, idealan za lakiranje. Nešto skuplji od iverala.
- **Lesonit (HDF)** — tanka ploča za leđa ormana, u 15 boja.

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
  {
    slug: "greske-pri-narucivanju-ormana-po-meri",
    title:
      "7 grešaka koje ljudi prave pri naručivanju ormana po meri (i kako ih izbeći)",
    description:
      "Izbegnite najčešće greške kod planiranja ormana po meri — od pogrešnog merenja do loše raspoređene unutrašnjosti. Saznajte šta stručnjaci savetuju.",
    date: "2026-04-10",
    readTime: "6 min",
    content: `Orman po meri je investicija koja treba da traje godinama. Ali jedna pogrešna odluka u fazi planiranja može da vas košta — nepraktičnog prostora, dodatnih troškova ili ormana koji jednostavno ne funkcioniše kako ste zamislili. Evo sedam najčešćih grešaka i kako da ih izbegnete.

## 1. Merenje „na oko"

Najčešća i najskuplja greška. Ljudi procene da je zid „oko 180 centimetara" i naruče orman na osnovu toga. Kada orman stigne, ili ne staje ili ostaje praznina od 5cm sa strane.

**Kako izbeći:**
- Merite **minimum tri puta** — pri vrhu, sredini i dnu zida
- Koristite **najmanji rezultat** jer zidovi nikada nisu savršeno ravni
- Ne zaboravite na **lajsne, prekidače i utičnice** koji mogu smetati
- Visinu merite na **obe strane** jer podovi i plafoni često nisu u ravni

Naš [3D konfigurator](/design) prikazuje tačne dimenzije u realnom vremenu, tako da odmah vidite kako orman staje u prostor.

## 2. Pogrešna dubina ormana

Standardna dubina od 60cm je idealna za spavaću sobu, ali ne i za svaku situaciju:

- **Hodnik** — 60cm dubine u hodniku širine 120cm znači da vam ostaje samo 60cm za prolaz. Izaberite **40–45cm** i koristite vešalice postavljene frontalno.
- **Niša** — dubina mora da prati dubinu niše, inače orman viri iz zida.
- **Iza vrata** — proverite da li vrata sobe mogu da se otvore kad se orman postavi.

**Pravilo:** Uvek prvo proverite koliko prostora ostaje za kretanje *nakon* što se orman postavi. Minimum za udoban prolaz je 70–80cm.

## 3. Previše kolona (ili premalo)

Čest instinkt je da se prostor podeli na mnogo uskih kolona „da sve ima svoje mesto". U praksi, kolone uže od 40cm su nepraktične — teško je složiti odeću, a pregradne ploče zauzimaju prostor.

**Optimalan broj kolona:**
- **Orman do 150cm** — 2 kolone
- **Orman 150–250cm** — 2–3 kolone
- **Orman 250–400cm** — 3–4 kolone

Svaka kolona treba da bude **minimum 40cm široka**, idealno 50–80cm. Širina kolone određuje šta može da stane unutra — šipka za vešalice zahteva minimum 55cm.

## 4. Zanemarivanje gornjeg prostora

Orman koji ne ide do plafona je promašena prilika. Prostor iznad ormana skuplja prašinu i ne služi ničemu. Orman od poda do plafona:

- **Daje 20–40cm dodatnog prostora** za sezonsku odeću, kofere ili posteljinu
- **Izgleda ugrađeno** — kao deo zida, ne kao komad nameštaja koji stoji u sobi
- **Sprečava nakupljanje prašine** na vrhu

Čak i ako gornji deo koristite samo za stvari koje vadite dva puta godišnje, to je bolje nego prazan prostor.

## 5. Sve police na istom razmaku

Fabričke police obično dolaze na razmaku od 30cm. Ali vaša odeća nije sva iste visine:

- **Džemperi i majice** — 25–30cm razmak je dovoljan
- **Posteljina i peškiri** — treba 35–40cm jer su kabasti
- **Cipele** — dovoljno je 15–20cm
- **Torbe i koferi** — mogu da traže i 45–50cm

**Savet:** Planirajte police prema sadržaju, ne prema estetici. Bolje je imati 5 polica na različitim razmacima nego 7 jednakih polica od kojih su neke poluprazne a neke pretrpane.

## 6. Pogrešan izbor vrata

Vrata nisu samo estetski element — ona direktno utiču na funkcionalnost:

- **Krilna vrata u uskom hodniku** — nemoguće ih otvoriti. Koristite klizna vrata.
- **Klizna vrata na malom ormanu** — klizna vrata se preklapaju, pa uvek pokrivaju pola ormana. Na ormanu od 90cm, vidite samo 45cm. Krilna vrata su bolji izbor za uske ormare.
- **Ogledalo na svim vratima** — izgleda dobro na papiru, ali u praksi čistite otiske prstiju svaki dan. Ogledalo na jednom krilu je sasvim dovoljno.

**Pravilo:** Klizna vrata za ormare šire od 150cm i za prostore gde nema mesta za otvaranje. Krilna vrata za sve ostalo.

## 7. Bez fioka

Mnogi ljudi planiraju orman samo sa policama i šipkom za vešalice. Ali bez fioka, sitne stvari — donji veš, čarape, maramice, kaiševi — završe u gomilama na policama.

**Minimum preporuka:**
- **3–4 fioke** u jednoj koloni za svakodnevne sitnice
- Fioke uvek idu **na dnu kolone** — lakše se otvara i zatvara
- Ako imate prostor, dodajte još jednu kolonu sa fiokama za aksesoar

Fioke su možda najkorisniji element u ormanu. Bolje je imati jednu policu manje i jednu fioku više.

## Kako da budete sigurni da nećete pogrešiti

Sve ove greške imaju jednu zajedničku stvar: nastaju zato što je teško zamisliti orman pre nego što ga vidite. Upravo zato smo napravili [besplatni 3D konfigurator](/design) — unesite dimenzije, dodajte kolone, police i fioke, izaberite materijal i vrata, i vidite tačno kako će vaš orman izgledati. Menjajte raspored dok ne budete potpuno zadovoljni, a onda naručite sa sigurnošću.`,
  },
  {
    slug: "program-za-crtanje-ormara",
    title: "Program za crtanje ormara: besplatno i online u 3D",
    description:
      "Besplatan program za crtanje ormara online: nacrtajte orman po meri u 3D, odmah vidite cenu i preuzmite tehnički crtež. Bez instalacije, radi i na telefonu.",
    date: "2026-10-02",
    readTime: "4 min",
    image: "/blog/program-za-crtanje-ormara.jpg",
    content: `Program za crtanje ormara treba da vam kaže dve stvari pre nego što bilo šta platite: da li orman staje u vaš prostor i koliko košta. [Konfigurator ormana](/design) na ovom sajtu crta orman po meri u 3D i računa cenu dok menjate mere. Radi u pregledaču i ne traži instalaciju ni nalog.

![Besplatni program za crtanje ormara: konfigurator sa merama ormana u 3D](/blog/program-za-crtanje-ormara.webp)

## Koji program za crtanje ormara izabrati

Većina programa za crtanje nameštaja pravljena je za stolare i dizajnere enterijera. Za jedan orman u spavaćoj sobi to znači sate učenja i crtanje svake ploče posebno. Ovako se razlikuju programi koje ljudi najčešće pominju:

- **PRO100**: program za projektovanje nameštaja koji se instalira na računar. Koriste ga stolarske radionice, a licenca košta preko hiljadu evra (u Slovačkoj 1.570 € bez PDV-a).
- **SketchUp Free**: besplatna verzija radi u pregledaču, ali samo za ličnu upotrebu. Orman crtate od nule, liniju po liniju, i program ne zna cene ploča.
- **IKEA PAX planer**: besplatan, ali crta samo IKEA PAX ormane. Elementi su široki 50, 75 ili 100 cm, pa u niši od 183 cm najbliži raspored ostavlja 8 cm praznog prostora.
- **Konfigurator ormana po meri**: besplatan i radi u pregledaču. Širinu upisujete na centimetar, od 50 do 400 cm, a cena se računa za tačno taj orman.

## Kako da nacrtate orman online u 6 koraka

Koraci su poređani isto kao u [konfiguratoru](/design). Na računaru su u meniju sa leve strane, a na telefonu u traci na dnu ekrana.

### 1. Spoljašnje dimenzije

Upišite širinu, visinu i dubinu u centimetrima. Širina može biti od 50 do 400 cm, visina od 50 do 280 cm, a dubina od 20 do 100 cm. Orman viši od 200 cm konfigurator deli na dva modula, donji i gornji.

Pre toga izmerite zid na tri visine i uzmite najmanju meru. Ostale greške pri merenju opisali smo u tekstu [7 grešaka pri naručivanju ormana po meri](/blog/greske-pri-narucivanju-ormana-po-meri). Koliko dubok treba da bude orman i koliko prostora treba ispod šipke piše u tekstu [Dimenzije ormana](/blog/dimenzije-ormana).

### 2. Kolone i pregrade

Orman se deli na kolone široke od 20 do 120 cm. Granicu između dve kolone pomerate prevlačenjem u 3D prikazu. U svaku kolonu dodajete police, fioke, šipku za ofingere ili vertikalne pregrade.

### 3. Materijal

Za korpus i vrata birate između više od 500 dekora ploča debljine 18 mm, a za leđa između 15 vrsta lesonita. Svaki dekor ima svoju cenu po kvadratnom metru, pa se ukupna cena promeni čim promenite materijal.

### 4. Baza

Ovde birate da li orman stoji na bazi (sokli) i koliko je ona visoka.

### 5. Vrata

Orman može imati krilna ili klizna vrata, ili ostati otvoren. Ručke birate za ceo orman ili za svaka vrata posebno. Ako ispred ormana nema mesta za krilna vrata, pogledajte rešenja u tekstu [Orman po meri za mali stan](/blog/orman-po-meri-za-mali-stan).

### 6. Dodaci

Dodatnu opremu birate iz kataloga, a njena cena se odmah dodaje na ukupnu.

## Šta dobijate kad završite crtež

- **Cenu odmah**: ukupna cena se računa dok crtate, od materijala po kvadratnom metru, okova i dodataka.
- **Mere na crtežu**: prikaz Kotiranje pokazuje mere kolona i pregrada.
- **Tehnički crtež 2D**: preuzimate ga kao sliku, za sebe ili za majstora.
- **Porudžbinu bez naloga**: posle porudžbine stižu potvrda i faktura sa IPS QR kodom za plaćanje.

Imate već skicu na papiru? Pošaljite je nama, a mi od nje napravimo orman. Kako to ide piše u tekstu [Skica ormara: od crteža na papiru do gotovog ormana po meri](/blog/skica-ormara-nacrt-za-izradu).

## Česta pitanja

### Da li je program za crtanje ormara besplatan?

Jeste. Crtanje, cena i tehnički crtež ne koštaju ništa i ne traže nalog. Plaćate samo orman, ako ga poručite.

### Da li radi na telefonu?

Radi. Na telefonu su koraci u traci na dnu ekrana, a ispod nje stoje cena i dugme Poruči.

### Mogu li da sačuvam crtež i kasnije ga menjam?

Možete, kad se prijavite. Sačuvane ormane nalazite u svom nalogu.

### Koliko košta orman po meri?

Zavisi od mera, materijala i opreme. Najbrže je da u [konfigurator](/design) upišete mere svog zida, cena se pojavi odmah. Kako materijal i vrata utiču na cenu piše u vodiču [Kako izabrati orman po meri](/blog/kako-izabrati-orman-po-meri).

[Otvorite konfigurator](/design) i upišite mere svog zida.`,
  },
  {
    slug: "skica-ormara-nacrt-za-izradu",
    title: "Skica ormara: od crteža na papiru do gotovog ormana po meri",
    description:
      "Imate skicu ormara? Pošaljite nam crtež ili ga prepišite u konfigurator. Vidite orman u 3D i tačnu cenu, a mi ga izradimo po meri i dopremimo.",
    date: "2026-10-02",
    readTime: "4 min",
    image: "/blog/skica-ormara-nacrt-za-izradu.png",
    content: `Skica ormara na papiru je dovoljna da dobijete gotov orman. Od vaše skice napravimo dizajn sa tačnim merama, vi vidite orman u 3D i cenu, a mi ga izradimo po meri i dopremimo. Nacrt za izradu i spisak ploča ne morate da crtate, to je naš posao.

![Skica ormara na papiru i isti orman u konfiguratoru, spreman za izradu](/blog/skica-ormara-nacrt-za-izradu.webp)

## Od skice do ormana: dva načina

- **Pošaljite skicu nama**: uslikajte crtež i pošaljite ga na [info@ormanipomeri.com](mailto:info@ormanipomeri.com), sa merama ako ih imate. Skicu prepišemo u konfigurator i javimo vam se sa dizajnom i cenom.
- **Prepišite je sami**: u [konfigurator ormana](/design) upišite mere, kolone i unutrašnjost sa skice. Cena se pojavi odmah i orman možete odmah da poručite.

${sketchUploadSection}Kad poručite, dobijate potvrdu i fakturu sa IPS QR kodom za plaćanje. Naš tim pregleda porudžbinu i kontaktira vas pre izrade.

## Šta mora da piše na skici ormara

- **Spoljne mere**: širina, visina i dubina u centimetrima.
- **Kolone**: koliko ih ima i koja je otprilike koliko široka. Dovoljno je "uska levo, široka u sredini".
- **Unutrašnjost**: police, fioke i šipku za ofingere ucrtajte u kolonu u kojoj idu. Šipka je kratka linija pri vrhu kolone.
- **Vrata**: krilna, klizna ili bez vrata.
- **Prepreke**: utičnice, prekidači, radijator, kosi plafon i lajsne. Sve to menja mere ormana, pa mora da bude na skici.

Ne mora da bude lepo nacrtano. Ako nešto na skici nije jasno, pitaćemo vas pre nego što počnemo. Standardne mere za dubinu, šipku i police su u tekstu [Dimenzije ormana](/blog/dimenzije-ormana).

## Skica ugradnog ormara

Izmerite nišu na tri visine (pri dnu, na sredini i pri vrhu) i upišite najmanju meru. Orman napravljen po najvećoj meri neće ući u nišu. Isto uradite i sa dubinom.

Visok orman ima još jedan problem: sklapa se dok leži, pa mora da se podigne. Dok se podiže, bočna stranica dijagonalom zakači plafon. Za plafon od 270 cm i dubinu od 60 cm, jedan komad može biti visok najviše 263 cm, jer mu je dijagonala tada oko 270 cm. Mi orman viši od 200 cm uvek pravimo iz dva modula, donjeg i gornjeg, pa se svaki podiže posebno.

## Mere koje možemo da izradimo

Ceo orman može biti širok od 50 do 400 cm, visok od 50 do 280 cm i dubok od 20 do 100 cm. Jedna kolona je široka od 20 do 120 cm. Ako vam na skici kolona ispadne šira, podelimo je na dve uže.

Za ploče birate između više od 500 dekora debljine 18 mm. Kako da sami nacrtate orman korak po korak opisali smo u tekstu [Program za crtanje ormara](/blog/program-za-crtanje-ormara).

## Isporuka i montaža

Orman izrađujemo i isporučujemo u Srbiji. Možete ga dobiti spreman za montažu, sa pripremljenim materijalom (slično IKEA sistemu), ili sa montažom i transportom na teritoriji Beograda i okoline.

## Česta pitanja

### Da li mi treba nacrt ili je dovoljna skica?

Dovoljna je skica sa merama. Nacrt za izradu i spisak ploča za sečenje pravimo mi.

### Kako da pošaljem skicu ormara?

Uslikajte je telefonom i pošaljite na [info@ormanipomeri.com](mailto:info@ormanipomeri.com). Napišite i gde orman ide i da li vam treba montaža.

### Koliko košta orman sa moje skice?

Najbrže je da mere sa skice upišete u [konfigurator](/design), cena se pojavi odmah. Ako skicu pošaljete nama, cenu vam javimo uz dizajn.

Pošaljite skicu na [info@ormanipomeri.com](mailto:info@ormanipomeri.com) ili je [prepišite u konfigurator](/design).`,
  },
  {
    slug: "dimenzije-ormana",
    title: "Dimenzije ormana: standardne mere i kako da opišete orman po meri",
    description:
      "Standardne dimenzije ormana: dubina 60 cm, 130–150 cm ispod šipke, 30–38 cm između polica. I kako da opišete orman u dve rečenice, a mi ga napravimo po meri.",
    date: "2026-10-10",
    readTime: "4 min",
    image: "/blog/dimenzije-ormana.png",
    content: `Standardni orman je dubok 60 cm, ispod šipke ima 130 do 150 cm za haljine i kapute, a police stoje na 30 do 38 cm jedna od druge. Sa tim merama svoj orman možete da opišete u dve rečenice, a mi ga od tog opisa napravimo po meri.

![Opis ormana od 200 × 240 × 60 cm i isti orman napravljen u konfiguratoru](/blog/dimenzije-ormana.webp)

## Standardne dimenzije ormana

![Skica ormana sa standardnim merama: dubina 60 cm, 130–150 cm ispod šipke, 30–38 cm između polica, fioke 10–40 cm](/blog/dimenzije-ormana-mere.webp)

- **Dubina**: 60 cm za orman u koji kačite odeću. Toliko treba da ofinger stane popreko, a da odeća ne zapinje za vrata. IKEA PAX je dubok 58 cm, a sa vratima 60. Ormanu samo sa policama dovoljno je 30 do 35 cm.
- **Prostor ispod šipke**: 130 do 150 cm za haljine i kapute, 90 do 100 cm za košulje i sakoe.
- **Razmak između polica**: 30 do 38 cm za presavijenu odeću. Police za cipele mogu biti gušće, a konfigurator dozvoljava razmak od najmanje 10 cm.
- **Fioke**: front je visok od 10 do 40 cm. Fioke idu na dno kolone, a police iznad njih.
- **Širina**: ceo orman od 50 do 400 cm, jedna kolona od 20 do 120 cm. Zato orman od 240 cm ima najmanje dve kolone, a orman od 300 cm najmanje tri.
- **Visina**: najčešće do plafona, kod nas najviše 280 cm. Orman viši od 200 cm pravimo iz dva modula, donjeg i gornjeg. Zašto, objasnili smo u tekstu [Skica ormara](/blog/skica-ormara-nacrt-za-izradu).
- **Prostor ispred ormana**: krilnim vratima treba 50 do 60 cm slobodnog poda ispred ormana. Ako ga nemate, izaberite klizna vrata. Orman sa kliznim vratima mora imati najmanje dve kolone.

## Kako da opišete orman

Opis ima dva dela: mere celog ormana i šta ide u koju kolonu. Orman sa slike na početku teksta opisan je ovako: "Orman 200 × 240 × 60 cm, 2 kolone. U levoj šipka za ofingere, u desnoj 5 polica. Dvokrilna vrata."

- **Mere**: širina × visina × dubina, u centimetrima. Zid izmerite na tri visine i upišite najmanju meru.
- **Kolone**: koliko ih ima, brojano s leva. Ako nisu iste širine, napišite širinu svake.
- **Unutrašnjost**: za svaku kolonu napišite koliko polica ima, da li ima šipku i koliko fioka.
- **Vrata**: krilna, dvokrilna, klizna ili bez vrata.

Kolona koju ne opišete ostaje prazna, pa je posle dopunite u konfiguratoru. Ostale greške koje se prave pri merenju i naručivanju opisali smo u tekstu [7 grešaka pri naručivanju ormana po meri](/blog/greske-pri-narucivanju-ormana-po-meri).

### Orman sa fiokama i kliznim vratima

![Opis ormana sa fiokama i kliznim vratima i orman napravljen po tom opisu](/blog/dimenzije-ormana-fioke.webp)

Širina od 240 cm se deli na dve kolone od po 120 cm. U levoj su fioke na dnu i police iznad njih, a desna je cela za šipku. Orman je visok 260 cm, pa ima gornji modul od 60 cm. Ploča između modula, na 200 cm, služi i kao polica.

### Plitka polica za knjige

![Opis police za knjige dubine 30 cm i polica napravljena po tom opisu](/blog/dimenzije-ormana-polica.webp)

Za knjige je dovoljno 30 cm dubine. Šest polica u visini od 200 cm daje oko 28 cm između polica.

## Pošaljite opis, mi napravimo orman

Opis pošaljite na [info@ormanipomeri.com](mailto:info@ormanipomeri.com). Od njega napravimo orman u konfiguratoru i javimo vam se sa dizajnom i cenom. Mere i raspored možete i sami da upišete u [konfigurator](/design), cena se pojavi odmah.

${descriptionSection}Imate skicu umesto opisa? Pošaljite i nju, kako piše u tekstu [Skica ormara: od crteža na papiru do gotovog ormana po meri](/blog/skica-ormara-nacrt-za-izradu).

## Česta pitanja

### Koja je standardna dubina ormana?

60 cm za orman sa šipkom za ofingere. Orman samo sa policama može biti dubok 30 do 35 cm.

### Koliko prostora treba ispod šipke?

130 do 150 cm za haljine i kapute, 90 do 100 cm za košulje i sakoe.

### Koliko kolona ima orman od 200 cm?

Najčešće dve kolone od po 100 cm. Jedna kolona može biti široka najviše 120 cm, pa orman od 200 cm ne može imati samo jednu.

### Koliko košta orman po meri?

Zavisi od mera, materijala i opreme. Upišite mere u [konfigurator](/design) i cena se pojavi odmah.

Pošaljite opis na [info@ormanipomeri.com](mailto:info@ormanipomeri.com) ili upišite mere u [konfigurator](/design).`,
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
