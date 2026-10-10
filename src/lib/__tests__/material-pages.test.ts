import { describe, expect, it } from "vitest";
import {
  cleanMaterialName,
  codeFromSlug,
  type MaterialPageData,
  materialCodeSlug,
  materialKind,
  materialSlug,
  similarMaterials,
} from "@/lib/material-pages";

const BOARD = ["Materijal za Korpus (18mm)", "Materijal za Lica/Vrata (18mm)"];
const material = (
  id: number,
  name: string,
  productCode: string,
  price = 2000,
  categories = BOARD,
): MaterialPageData => ({
  id,
  name,
  productCode,
  price,
  img: null,
  thickness: 18,
  categories,
});

describe("cleanMaterialName", () => {
  it.each([
    ["EGGER HRAST ŠERMAN BRAON - H1344ST32", "Egger Hrast Šerman Braon"],
    ["EGGER FINELINE TAMNO SIVI-H3198ST19", "Egger Fineline Tamno Sivi"],
    ["OUT-ARTSTONE OXYDE - 2800x2120x18 - TR9", "Artstone Oxyde"],
    [
      "OUT- PORTLAND TEXSTONE SIVI - 2800x2120x18 - A11",
      "Portland Texstone Sivi",
    ],
    [
      "MDF ŠAMPANJ ULTRA MAT - 2800x1220x18 - 7045 UM/UM",
      "MDF Šampanj Ultra Mat",
    ],
    ["MDF MAT EGGER INDIGO PLAVA -U599PMST9", "MDF Mat Egger Indigo Plava"],
    ["SREDNJE SIVA SJAJ M345 FS70/FS70 (191MG)", "Srednje Siva Sjaj"],
    ["CHARCOAL FLOW K353 RT", "Charcoal Flow"],
    ["LESONIT VENGE HDF 854", "Lesonit Venge HDF"],
  ])("%s → %s", (raw, clean) => {
    expect(cleanMaterialName(raw)).toBe(clean);
  });

  it("keeps a name that has no code in it", () => {
    expect(cleanMaterialName("LESONIT OBOSTRANO BELI")).toBe(
      "Lesonit Obostrano Beli",
    );
  });
});

describe("material URLs", () => {
  it("puts the name first and the code last, and finds the code again", () => {
    const m = material(1, "EGGER HRAST ŠERMAN BRAON - H1344ST32", "H1344ST32");
    const slug = materialSlug(m);
    expect(slug).toBe("egger-hrast-serman-braon-h1344st32");
    expect(codeFromSlug(slug)).toBe(materialCodeSlug(m));
  });

  it("transliterates đ", () => {
    expect(materialSlug(material(2, "ĐUBRE ZELENA K1 SU", "K1SU"))).toBe(
      "djubre-zelena-k1su",
    );
  });
});

describe("materialKind", () => {
  it("leaves edge tapes out", () => {
    expect(
      materialKind(
        material(3, "KANT TRAKA BELA", "KT1", 100, ["Kant trake abs"]),
      ),
    ).toBeNull();
    expect(
      materialKind(
        material(4, "LESONIT SIVI HDF-112", "L112", 600, [
          "Materijal za Leđa (3mm)",
        ]),
      ),
    ).toBe("back");
  });
});

describe("similarMaterials", () => {
  it("prefers decors sharing a word, then the closest price, and never mixes kinds", () => {
    const self = material(10, "SVETLI HRAST K001 PW", "K001PW", 2000);
    const all = [
      self,
      material(11, "TAMNI HRAST K002 PW", "K002PW", 5000),
      material(12, "SIVA K003 PW", "K003PW", 2010),
      material(13, "LESONIT HRAST HDF 1", "L1", 2000, [
        "Materijal za Leđa (3mm)",
      ]),
    ];
    expect(similarMaterials(self, all).map((m) => m.id)).toEqual([11, 12]);
  });
});
