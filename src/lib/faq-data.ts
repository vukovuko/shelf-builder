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
    question: "Mogu li da krenem od skice ili slike?",
    answer:
      "Možete. U konfiguratoru kliknite „Učitaj skicu ili sliku“ i pošaljite fotografiju skice ili ormana koji vam se dopada. Konfigurator prepozna kolone, police, fioke, šipke i vrata i od toga napravi početni dizajn koji dalje menjate. Mere uzima sa slike samo ako su napisane, inače kreće od visine 240 cm i dubine 60 cm, a širinu određuje po proporcijama crteža. Za učitavanje skice potrebno je da budete prijavljeni.",
  },
  {
    question: "Koje materijale mogu da izaberem?",
    answer:
      "Za korpus i vrata birate između više od 500 dekora ploča debljine 18 mm, a za leđa ormana između 15 vrsta lesonita (HDF, 3 mm). Svaki materijal ima svoju cenu po kvadratnom metru, pa se cena menja čim promenite materijal.",
  },
  {
    question: "Koje su minimalne i maksimalne dimenzije?",
    answer:
      "Širina ormana može biti od 50 cm do 400 cm, visina od 50 cm do 280 cm, a dubina od 20 cm do 100 cm. Jedna kolona može biti široka od 20 cm do 120 cm; širi orman se deli na više kolona.",
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
