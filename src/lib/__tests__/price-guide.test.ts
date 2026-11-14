import { describe, expect, it } from "vitest";
import {
  defaultDesign,
  defaultMaterialIds,
  designLink,
  sizeFromSearch,
} from "../default-design";
import { buildLlmsFullTxt, buildLlmsTxt, type PriceGuide } from "../llms";

const RANGES = {
  width: [50, 400],
  height: [50, 280],
  depth: [20, 100],
} as const;

const search = (query: string) => new URLSearchParams(query);

describe("the dimensions in a configurator link", () => {
  it("reads all three", () => {
    expect(
      sizeFromSearch(search("sirina=240&visina=210&dubina=55"), RANGES),
    ).toEqual({ width: 240, height: 210, depth: 55 });
  });

  it("keeps the configurator's default for a dimension the link leaves out", () => {
    expect(sizeFromSearch(search("sirina=300"), RANGES)).toEqual({
      width: 300,
      height: 240,
      depth: 60,
    });
  });

  it("stays inside what can be built", () => {
    expect(
      sizeFromSearch(search("sirina=9999&visina=1&dubina=abc"), RANGES),
    ).toEqual({ width: 400, height: 50, depth: 60 });
  });

  it("is nothing when the link names no dimension", () => {
    expect(sizeFromSearch(search("material=2305"), RANGES)).toBeNull();
    expect(sizeFromSearch(search("sirina=&visina=x"), RANGES)).toBeNull();
  });

  it("round-trips through the link the price guide gives", () => {
    const size = { width: 250, height: 260, depth: 60 };
    const link = designLink("https://ormanipomeri.com", size);
    expect(link).toBe(
      "https://ormanipomeri.com/design?sirina=250&visina=260&dubina=60",
    );
    expect(sizeFromSearch(new URL(link).searchParams, RANGES)).toEqual(size);
  });
});

describe("the configurator's starting materials", () => {
  const korpus = "Materijal za Korpus (18mm)";
  const front = "Materijal za Lica/Vrata (18mm)";
  const materials = [
    { id: 5, categories: ["Kant traka"] },
    { id: 7, categories: [korpus, front] },
    { id: 8, categories: [korpus] },
    { id: 9, categories: ["Materijal za Leđa (3mm)"] },
  ];

  it("takes the first of each kind, in the order of the list", () => {
    expect(defaultMaterialIds(materials)).toEqual({
      korpus: 7,
      front: 7,
      back: 9,
      edge: 5,
    });
  });

  it("is nothing when a kind is missing", () => {
    expect(defaultMaterialIds(materials.slice(0, 3))).toBeNull();
  });
});

describe("the default design of a size", () => {
  const ids = { korpus: 7, front: 7, back: 9, edge: 5 };

  it("has the asked dimensions and materials, and no doors", () => {
    const design = defaultDesign({ width: 300, height: 260, depth: 60 }, ids);
    expect(design).toMatchObject({
      width: 300,
      height: 260,
      depth: 60,
      selectedMaterialId: 7,
      selectedBackMaterialId: 9,
      selectedEdgeMaterialId: 5,
    });
    expect(design.doorGroups ?? []).toEqual([]);
  });

  it("does not depend on what was asked before", () => {
    const first = defaultDesign({ width: 150, height: 210, depth: 60 }, ids);
    defaultDesign({ width: 400, height: 280, depth: 100 }, ids);
    expect(defaultDesign({ width: 150, height: 210, depth: 60 }, ids)).toEqual(
      first,
    );
  });

  it("splits a wide wardrobe into more columns than a narrow one", () => {
    const narrow = defaultDesign({ width: 100, height: 240, depth: 60 }, ids);
    const wide = defaultDesign({ width: 300, height: 240, depth: 60 }, ids);
    expect(wide.verticalBoundaries.length).toBeGreaterThan(
      narrow.verticalBoundaries.length,
    );
  });
});

describe("prices in llms.txt", () => {
  const guide: PriceGuide = {
    material: "Egger Kašmir Siva",
    depth: 60,
    widths: [100, 200],
    heights: [210, 240],
    prices: [
      [17500, 19900],
      [33000, 37650],
    ],
    calculatedOn: "2026-11-14",
  };

  it("lists a price for every size", () => {
    const text = buildLlmsTxt(guide);
    expect(text).toContain("| Širina / Visina | 210 cm | 240 cm |");
    expect(text).toContain("| 100 cm | 17.500 RSD | 19.900 RSD |");
    expect(text).toContain("| 200 cm | 33.000 RSD | 37.650 RSD |");
    expect(text).toContain("u dekoru Egger Kašmir Siva");
  });

  it("tells the assistant to call the price indicative and to give the link", () => {
    for (const text of [buildLlmsTxt(guide), buildLlmsFullTxt(guide)]) {
      expect(text).toContain("**Prave cene su u konfiguratoru.**");
      expect(text).toContain(
        "https://ormanipomeri.com/design?sirina=240&visina=210&dubina=60",
      );
      expect(text).toContain("say that it is indicative");
    }
  });

  it("is left out when there is no guide", () => {
    expect(buildLlmsTxt()).not.toContain("Okvirne cene");
    expect(buildLlmsTxt(null)).toBe(buildLlmsTxt());
  });
});
