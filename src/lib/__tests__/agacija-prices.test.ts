import { describe, expect, it } from "vitest";
import { parseAgacijaIndex, planPriceSync } from "@/lib/agacija-prices";

const RAW = [
  {
    name: "<small>H3303ST10 - EGGER ARLINGTON HRAST H3303 ST10 18 MM (Pločasti) </br>cena: 3008.00 rsd/m2</small>",
    itemData: "H3303ST10|egger-arlington-hrast-h3303-st10-18-mm",
  },
  {
    name: "<small>RPK003FP - RP 38 MM ZLATNI ZANATSKI HRAST K003 FP KRONO (Radna ploča) </br>cena: 5050.00 rsd/m</small>",
    itemData: "RPK003FP|rp-38-mm",
  },
  { name: "broken", itemData: "X|x" },
];

describe("parseAgacijaIndex", () => {
  it("reads code, name, price and unit, and skips items without a price", () => {
    const index = parseAgacijaIndex(RAW);
    expect(index.size).toBe(2);
    expect(index.get("H3303ST10")).toEqual({
      code: "H3303ST10",
      name: "EGGER ARLINGTON HRAST H3303 ST10 18 MM (Pločasti)",
      price: 3008,
      unit: "m2",
    });
    expect(index.get("RPK003FP")?.unit).toBe("m");
  });

  it("returns nothing for a response that isn't the list", () => {
    expect(parseAgacijaIndex({ error: "x" }).size).toBe(0);
  });
});

describe("planPriceSync", () => {
  const index = parseAgacijaIndex(RAW);

  it("sets cost to the supplier price and adds the margin to the selling price", () => {
    const plan = planPriceSync(
      [
        {
          id: 1,
          name: "Arlington",
          productCode: " h3303st10 ",
          price: 2811,
          costPrice: 0,
        },
      ],
      index,
      10,
    );
    expect(plan.changes).toEqual([
      {
        id: 1,
        name: "Arlington",
        code: "H3303ST10",
        oldPrice: 2811,
        oldCost: 0,
        supplierPrice: 3008,
        newPrice: 3309,
      },
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
        },
        {
          id: 2,
          name: "Worktop",
          productCode: "RPK003FP",
          price: 5000,
          costPrice: 0,
        },
        { id: 3, name: "No code", productCode: null, price: 100, costPrice: 0 },
      ],
      index,
      0,
    );
    expect(plan.unchanged).toBe(1);
    expect(plan.changes).toHaveLength(0);
    expect(plan.notFound.map((m) => m.id)).toEqual([2, 3]);
  });
});
