export interface FaqItem {
  question: string;
  answer: string;
}

export const faqItems: FaqItem[] = [
  {
    question: "Kako funkcioniše konfigurator?",
    answer:
      "Konfigurator vam omogućava da korak po korak dizajnirate orman po meri. Birate dimenzije, materijale, broj kolona, police, fioke, vrata i dodatke. Sve promene se prikazuju uživo u 3D prikazu.",
  },
  {
    question: "Koje materijale mogu da izaberem?",
    answer:
      "Nudimo preko 30 premium materijala uključujući medijapan (MDF), iveral, furnir i masivno drvo u različitim bojama i teksturama. Svaki materijal ima definisanu debljinu i cenu po kvadratnom metru.",
  },
  {
    question: "Koje su minimalne i maksimalne dimenzije?",
    answer:
      "Širina ormana može biti od 40cm do 400cm, visina od 60cm do 260cm, a dubina od 30cm do 80cm. Svaka kolona može biti široka između 10cm i 100cm.",
  },
  {
    question: "Da li mogu da dodam klizna vrata?",
    answer:
      "Da! U koraku za vrata možete izabrati klizna vrata koja pokrivaju ceo orman. Klizna vrata se automatski raspoređuju po kolonama sa pravilnim preklapanjem i šinama.",
  },
  {
    question: "Koliko košta izrada ormana?",
    answer:
      "Cena zavisi od dimenzija, izabranih materijala i dodataka. Konfigurator automatski računa cenu na osnovu svih komponenti — možete videti detaljnu specifikaciju u poslednjem koraku.",
  },
  {
    question: "Kako da poručim orman nakon dizajna?",
    answer:
      "Nakon što završite dizajn, možete poslati porudžbinu direktno iz konfiguratora. Dobićete PDF sa tehničkim crtežom i kompletnom specifikacijom. Naš tim će vas kontaktirati radi potvrde detalja.",
  },
];

/** Schema.org FAQPage JSON-LD object — ready to stringify */
export const faqJsonLd = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: faqItems.map((item) => ({
    "@type": "Question",
    name: item.question,
    acceptedAnswer: {
      "@type": "Answer",
      text: item.answer,
    },
  })),
};
