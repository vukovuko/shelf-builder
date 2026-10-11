import { describe, expect, it } from "vitest";
import {
  findNewProducts,
  parseAgacijaIndex,
  planPriceSync,
} from "@/lib/agacija-prices";

const item = (code: string, name: string, price: string, unit = "m2") => ({
  name: `<small>${code} - ${name} </br>cena: ${price} rsd/${unit}</small>`,
  itemData: `${code}|slug`,
});

const RAW = [
  item(
    "H3303ST10",
    "EGGER ARLINGTON HRAST H3303 ST10 18 MM (Pločasti)",
    "3008.00",
  ),
  item(
    "RPK003FP",
    "RP 38 MM ZLATNI ZANATSKI HRAST K003 FP KRONO (Radna ploča)",
    "5050.00",
    "m",
  ),
  item("H1732ST9", "EGGER BREZA PESAK-H1732ST9 (Pločasti)", "2506.00"),
  item("MDF18", "MMDF 18 MM (Pločasti)", "2012.00"),
  item("SPER18M", "ŠPER BREZA 18 MM (Pločasti)", "4114.00"),
  item(
    "B851FH",
    "B0851FH ZIMSKO BELA enterijer KOMPAKT 10 (Pločasti)",
    "27205.00",
  ),
  item("25MMKRON", "25 MM JAVOR 375 PR (Pločasti)", "3616.00"),
  { name: "broken", itemData: "X|x" },
];

describe("parseAgacijaIndex", () => {
  it("reads code, name, price, unit, group and thickness", () => {
    const index = parseAgacijaIndex(RAW);
    expect(index.size).toBe(7);
    expect(index.get("H3303ST10")).toEqual({
      code: "H3303ST10",
      name: "EGGER ARLINGTON HRAST H3303 ST10 18 MM",
      price: 3008,
      unit: "m2",
      category: "Pločasti",
      thickness: 18,
    });
    expect(index.get("RPK003FP")?.unit).toBe("m");
    expect(index.get("H1732ST9")?.thickness).toBeNull();
  });

  it("returns nothing for a response that isn't the list", () => {
    expect(parseAgacijaIndex({ error: "x" }).size).toBe(0);
  });
});

describe("planPriceSync", () => {
  const index = parseAgacijaIndex(RAW);
  const base = { name: "Arlington", productCode: " h3303st10 ", costPrice: 0 };

  it("uses the global margin unless the material has its own", () => {
    const plan = planPriceSync(
      [
        { ...base, id: 1, price: 2811, marginPercent: null },
        { ...base, id: 2, price: 2811, marginPercent: 20 },
      ],
      index,
      10,
    );
    expect(
      plan.changes.map((c) => [c.id, c.supplierPrice, c.newPrice, c.ownMargin]),
    ).toEqual([
      [1, 3008, 3309, false],
      [2, 3008, 3610, true],
    ]);
  });

  it("leaves matching prices alone and lists codes the supplier doesn't have", () => {
    const plan = planPriceSync(
      [
        {
          id: 1,
          name: "Same",
          productCode: "H3303ST10",
          price: 3008,
          costPrice: 3008,
          marginPercent: null,
        },
        {
          id: 2,
          name: "Worktop",
          productCode: "RPK003FP",
          price: 5000,
          costPrice: 0,
          marginPercent: null,
        },
        {
          id: 3,
          name: "No code",
          productCode: null,
          price: 100,
          costPrice: 0,
          marginPercent: null,
        },
      ],
      index,
      0,
    );
    expect(plan.unchanged).toBe(1);
    expect(plan.changes).toHaveLength(0);
    expect(plan.notFound.map((m) => m.id)).toEqual([2, 3]);
  });
});

describe("findNewProducts", () => {
  it("offers decor boards we don't have, not raw boards, plywood, compact or other thicknesses", () => {
    const fresh = findNewProducts(parseAgacijaIndex(RAW), ["H3303ST10"]);
    expect(fresh.map((i) => i.code)).toEqual(["H1732ST9"]);
  });
});
