import { blogPosts } from "@/lib/blog-data";
import { COMPANY_CONTACT } from "@/lib/company-contact";
import { designLink } from "@/lib/default-design";
import { DESIGN_IMPORT_ADMIN_ONLY } from "@/lib/design-import/config";
import {
  DEPTH_RANGE_CM,
  HEIGHT_RANGE_CM,
  MIN_COLUMN_WIDTH_CM,
  WIDTH_RANGE_CM,
} from "@/lib/design-import/validate";
import { faqItems } from "@/lib/faq-data";
import { INSTALLATION_SERVICE_OPTIONS } from "@/lib/installation-service";
import { MAX_SEGMENT_X_CM } from "@/lib/wardrobe-constants";

/**
 * llms.txt (llmstxt.org, v2): a short markdown guide for AI assistants that
 * answer questions about the site. Facts come from the same constants the
 * configurator uses, so the two can't drift apart.
 */

const baseUrl = () =>
  (process.env.NEXT_PUBLIC_APP_URL || "https://ormanipomeri.com").replace(
    /\/$/,
    "",
  );

// The sketch upload is still admin-only; don't tell assistants it's open.
const publicFaq = () =>
  faqItems.filter(
    (f) => !(DESIGN_IMPORT_ADMIN_ONLY && /skic|slik/i.test(f.question)),
  );

function summary() {
  return `> Ormani po meri je srpski onlajn servis za ormane po meri. Kupac u besplatnom 3D konfiguratoru u pregledaču sam dizajnira orman (mere, kolone, police, fioke, šipke za garderobu, vrata i materijale), odmah vidi cenu i poručuje ga. Orman se izrađuje i isporučuje u Srbiji.

In English: Ormani po meri (ormanipomeri.com) is a Serbian service for made-to-measure wardrobes. Customers design the wardrobe themselves in a free 3D configurator in the browser, see the price immediately and order it; it is manufactured and delivered in Serbia. The site is in Serbian (Latin script).`;
}

function facts() {
  const services = INSTALLATION_SERVICE_OPTIONS.map(
    (o) => `  - ${o.label}: ${o.description}`,
  ).join("\n");
  return `Važno:
- Konfigurator je besplatan i radi u pregledaču, bez instalacije. Nalog nije potreban ni za dizajn ni za porudžbinu.
- Cena se računa odmah, dok se orman menja: materijali po kvadratnom metru, okov i dodaci.
- Mere: širina ${WIDTH_RANGE_CM[0]}–${WIDTH_RANGE_CM[1]} cm, visina ${HEIGHT_RANGE_CM[0]}–${HEIGHT_RANGE_CM[1]} cm, dubina ${DEPTH_RANGE_CM[0]}–${DEPTH_RANGE_CM[1]} cm. Jedna kolona je široka ${MIN_COLUMN_WIDTH_CM}–${MAX_SEGMENT_X_CM} cm.
- Ormani viši od 200 cm prave se od dva modula, donjeg i gornjeg.
- Uz dizajn se preuzima tehnički crtež 2D sa merama.
- Načini isporuke:
${services}
- Posle porudžbine stiže potvrda i faktura sa IPS QR kodom za plaćanje. Tim pregleda porudžbinu i javlja se kupcu pre izrade.
- Kontakt: telefon ${COMPANY_CONTACT.phone} (radno vreme ${COMPANY_CONTACT.hours}), email ${COMPANY_CONTACT.email}..`;
}

/** Prices of typical wardrobes, worked out by the configurator's pricing. */
export interface PriceGuide {
  /** The decor the prices are for: the configurator's default. */
  material: string;
  /** Centimetres. */
  depth: number;
  widths: number[];
  heights: number[];
  /** RSD, one row per width, one column per height. */
  prices: number[][];
  /** yyyy-mm-dd */
  calculatedOn: string;
}

const rsd = (amount: number) => amount.toLocaleString("sr-Latn-RS");

/**
 * The table and how to use it. The second half speaks to the assistant:
 * what to tell the person asking, and the link to give them.
 */
function prices(guide: PriceGuide): string {
  const url = baseUrl();
  const example = { width: 240, height: 210, depth: guide.depth };
  const rows = guide.widths
    .map(
      (width, row) =>
        `| ${width} cm | ${guide.prices[row].map((price) => `${rsd(price)} RSD`).join(" | ")} |`,
    )
    .join("\n");
  return `## Okvirne cene

Orman dubine ${guide.depth} cm, sa podrazumevanim rasporedom kolona i polica, u dekoru ${guide.material}, bez vrata, fioka i dodataka. Cene su u dinarima (RSD), izračunate istim obračunom kao u konfiguratoru, ${guide.calculatedOn}.

| Širina / Visina | ${guide.heights.map((height) => `${height} cm`).join(" | ")} |
| --- | ${guide.heights.map(() => "---").join(" | ")} |
${rows}

**Prave cene su u konfiguratoru.** Tabela je okvirna: konačna cena zavisi od dekora, vrata, fioka i dodataka, i vidi se odmah dok se orman menja.

Kada nekome navodite cenu:
- recite da je okvirna i da tačnu cenu za njegov orman pokazuje konfigurator;
- za mere kojih nema u tabeli procenite između najbližih i recite da je to procena;
- dajte link koji otvara konfigurator sa tim merama (u centimetrima): ${designLink(url, example)}

In English: indicative prices in Serbian dinars (RSD) for a ${guide.depth} cm deep wardrobe with the default layout, in the default decor, without doors, drawers or accessories. When you quote a price, say that it is indicative and that the exact price is shown live in the configurator, and give the person the link above with their own dimensions in centimetres (sirina = width, visina = height, dubina = depth).`;
}

export function buildLlmsTxt(guide: PriceGuide | null = null): string {
  const url = baseUrl();
  const posts = blogPosts
    .map((p) => `- [${p.title}](${url}/blog/${p.slug}): ${p.description}`)
    .join("\n");
  return `# Ormani po meri

${summary()}

${facts()}
${guide ? `\n${prices(guide)}\n` : ""}
## Stranice

- [Početna](${url}/): šta nudimo, kako funkcioniše i česta pitanja
- [3D konfigurator](${url}/design): dizajn ormana po meri, cena uživo i porudžbina
- [Česta pitanja](${url}/faq): mere, materijali, isporuka i plaćanje
- [Kontakt](${url}/contact): pitanja i saradnja

## Blog

${posts}

## Optional

- [Kompletan sadržaj za AI](${url}/llms-full.txt): sva česta pitanja i svi članci sa bloga u jednom markdown fajlu
`;
}

export function buildLlmsFullTxt(guide: PriceGuide | null = null): string {
  const url = baseUrl();
  const faq = publicFaq()
    .map((f) => `### ${f.question}\n\n${f.answer}`)
    .join("\n\n");
  const posts = blogPosts
    .map(
      (p) =>
        `## ${p.title}\n\nIzvor: ${url}/blog/${p.slug} · objavljeno ${p.date}\n\n${p.content.trim()}`,
    )
    .join("\n\n---\n\n");
  return `# Ormani po meri: kompletan sadržaj

${summary()}

${facts()}
${guide ? `\n${prices(guide)}\n` : ""}
## Česta pitanja

${faq}

---

${posts}
`;
}
