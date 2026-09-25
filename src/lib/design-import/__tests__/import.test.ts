import { beforeEach, describe, expect, it } from "vitest";
import { useShelfStore } from "@/lib/store";
import { buildBlocksX } from "@/lib/wardrobe-utils";
import { importWardrobeDraft } from "../apply";
import { validateWardrobe } from "../validate";

const state = () => useShelfStore.getState();
const codes = (r: { adjustments: { code: string }[] }) =>
  r.adjustments.map((a) => a.code);
const columnWidthsCm = () =>
  buildBlocksX(state().width / 100, state().verticalBoundaries).map((b) =>
    Math.round(b.width * 100),
  );

beforeEach(() => state().resetToDefaults());

describe("nothing recognized", () => {
  it.each([
    null,
    undefined,
    "garbage",
    42,
    [],
    { recognized: false },
  ])("%j leaves the current design alone", (raw) => {
    state().setWidth(300);
    const r = importWardrobeDraft(raw);
    expect(r.status).toBe("empty");
    expect(state().width).toBe(300);
  });
});

describe("rough sketches with no numbers", () => {
  it("an empty box becomes the standard wardrobe", () => {
    const r = importWardrobeDraft({ recognized: true });
    expect(r.status).toBe("ok");
    expect(codes(r)).toContain("dimensions.defaulted");
    expect([state().width, state().height, state().depth]).toEqual([
      210, 240, 60,
    ]);
    expect(r.violations).toEqual([]);
  });

  it("a square with a + becomes two columns with one shelf each", () => {
    const r = importWardrobeDraft({
      recognized: true,
      aspectRatio: 1,
      sections: [{ shelves: [0.5] }, { shelves: [0.5] }],
    });
    expect(r.status).toBe("ok");
    expect(columnWidthsCm()).toEqual([105, 105]);
    expect(state().columnHorizontalBoundaries[0]).toHaveLength(1);
    expect(state().columnHorizontalBoundaries[1]).toHaveLength(1);
    expect(state().columnHorizontalBoundaries[0][0]).toBeCloseTo(1.2, 2);
  });

  it("keeps one column slightly wider when drawn that way", () => {
    importWardrobeDraft({
      recognized: true,
      sections: [{ widthRatio: 1 }, { widthRatio: 1.3 }],
    });
    const [a, b] = columnWidthsCm();
    expect(a + b).toBe(210);
    expect(b).toBeGreaterThan(a);
  });

  it("four equal sections in a standard width become two divided columns", () => {
    const r = importWardrobeDraft({
      recognized: true,
      sections: [{}, {}, {}, {}],
      widthCm: 210,
    });
    expect(codes(r)).toContain("columns.merged");
    expect(columnWidthsCm()).toEqual([105, 105]);
    expect(state().elementConfigs.A1?.columns).toBe(2);
    expect(state().elementConfigs.B1?.columns).toBe(2);
    expect(r.violations).toEqual([]);
  });

  it("three sections with no width get a width that fits three columns", () => {
    importWardrobeDraft({ recognized: true, sections: [{}, {}, {}] });
    expect(columnWidthsCm()).toHaveLength(3);
  });

  it("a line drawn at the 200 cm split is the module split, not a shelf", () => {
    importWardrobeDraft({
      recognized: true,
      sections: [{ shelves: [0.83] }, {}],
    });
    expect(state().columnHorizontalBoundaries[0] ?? []).toHaveLength(0);
  });
});

describe("impossible requests are snapped to the rules", () => {
  it("50 drawers become the most that fit", () => {
    const r = importWardrobeDraft({
      recognized: true,
      sections: [{ drawers: 50 }, {}],
    });
    expect(codes(r)).toContain("drawers.reduced");
    expect(r.violations).toEqual([]);
    const drawers = state().elementConfigs.A1?.drawerCounts?.[0] ?? 0;
    expect(drawers).toBeGreaterThan(0);
    expect(drawers).toBeLessThanOrEqual(11);
  });

  it("one drawer gets its own 20 cm compartment", () => {
    importWardrobeDraft({ recognized: true, sections: [{ drawers: 1 }, {}] });
    expect(state().elementConfigs.A1?.drawerCounts?.[0]).toBe(1);
    expect(state().columnHorizontalBoundaries[0][0]).toBeCloseTo(0.218, 3);
  });

  it("30 shelves 3 cm apart become fewer, 10 cm apart", () => {
    const shelves = Array.from({ length: 30 }, (_, i) => 0.05 + i * 0.0125);
    const r = importWardrobeDraft({
      recognized: true,
      sections: [{ shelves }, {}],
    });
    expect(codes(r)).toContain("shelves.reduced");
    expect(r.violations).toEqual([]);
  });

  it("out-of-range dimensions are clamped, garbage ones defaulted", () => {
    const r = importWardrobeDraft({
      recognized: true,
      widthCm: 900,
      heightCm: -5,
      depthCm: "abc",
    });
    expect(state().width).toBe(400);
    expect(state().height).toBe(240);
    expect(state().depth).toBe(60);
    expect(codes(r)).toContain("width.clamped");
    expect(r.violations).toEqual([]);
  });

  it("twelve sections in 100 cm are merged to what fits", () => {
    const r = importWardrobeDraft({
      recognized: true,
      widthCm: 100,
      sections: Array.from({ length: 12 }, () => ({})),
    });
    expect(codes(r)).toContain("dividers.reduced");
    expect(state().elementConfigs.A1?.columns).toBeLessThanOrEqual(6);
    expect(r.violations).toEqual([]);
  });

  it("a rod in a divided column is dropped, in a clean one it is placed", () => {
    const r = importWardrobeDraft({
      recognized: true,
      widthCm: 100,
      sections: [{ rod: true }, {}],
    });
    expect(codes(r)).toContain("rod.dropped");
    importWardrobeDraft({ recognized: true, sections: [{ rod: true }, {}] });
    expect(state().compartmentExtras.A1?.rod).toBe(true);
  });

  it("sliding doors on a one-column wardrobe are dropped", () => {
    const r = importWardrobeDraft({
      recognized: true,
      widthCm: 100,
      slidingDoors: true,
    });
    expect(codes(r)).toContain("sliding.dropped");
    expect(state().slidingDoors).toBe(false);
    importWardrobeDraft({ recognized: true, slidingDoors: true });
    expect(state().slidingDoors).toBe(true);
  });
});

describe("doors", () => {
  it("double doors start above external drawers", () => {
    const r = importWardrobeDraft({
      recognized: true,
      sections: [
        { drawers: 3, door: "double", shelves: [0.6] },
        { door: "left" },
      ],
    });
    expect(r.violations).toEqual([]);
    const groups = state().doorGroups;
    const colA = groups.filter((g) => g.column === "A");
    expect(colA.length).toBeGreaterThan(0);
    expect(colA.every((g) => !g.compartments.includes("A1"))).toBe(true);
    expect(groups.some((g) => g.column === "B" && g.type === "left")).toBe(
      true,
    );
  });

  it("a 10 cm top module gets no door", () => {
    const r = importWardrobeDraft({
      recognized: true,
      heightCm: 210,
      sections: [{ door: "left" }, { door: "right" }],
    });
    expect(codes(r)).toContain("doors.dropped");
    expect(r.violations).toEqual([]);
  });
});

describe("garbage inside a recognized drawing", () => {
  it("bad values are dropped one by one", () => {
    const r = importWardrobeDraft({
      recognized: "true",
      sections: [
        {
          shelves: ["0.5", "abc", 2, -1, null],
          drawers: "3",
          door: "sideways",
        },
        "not a section",
        { widthRatio: -4, rod: "yes" },
      ],
    });
    expect(r.status).not.toBe("empty");
    expect(r.violations).toEqual([]);
  });

  it("everything maxed out still yields a valid wardrobe", () => {
    const section = {
      shelves: Array.from({ length: 14 }, (_, i) => (i + 1) / 15),
      drawers: 11,
      rod: true,
      door: "doubleMirror",
    };
    const r = importWardrobeDraft({
      recognized: true,
      widthCm: 400,
      heightCm: 280,
      base: true,
      sections: [section, section, section, section],
    });
    expect(r.violations).toEqual([]);
    expect(r.status).not.toBe("fallback");
  });
});

describe("fuzz: any draft ends valid without falling back", () => {
  // Deterministic PRNG so failures reproduce.
  let seed = 42;
  const rand = () => {
    seed = (seed * 1664525 + 1013904223) % 2 ** 32;
    return seed / 2 ** 32;
  };
  const pick = <T>(xs: T[]) => xs[Math.floor(rand() * xs.length)];
  const maybe = <T>(v: () => T) => (rand() < 0.5 ? v() : undefined);
  const doors = [
    "none",
    "left",
    "right",
    "double",
    "leftMirror",
    "rightMirror",
    "doubleMirror",
    "bogus",
  ];

  const randomDraft = () => ({
    recognized: rand() < 0.95,
    widthCm: maybe(() => Math.round(rand() * 600 - 50)),
    heightCm: maybe(() => Math.round(rand() * 400 - 20)),
    depthCm: maybe(() => Math.round(rand() * 150)),
    aspectRatio: maybe(() => rand() * 4),
    base: rand() < 0.3,
    slidingDoors: rand() < 0.15,
    sections: Array.from({ length: Math.floor(rand() * 9) }, () => ({
      widthRatio: maybe(() => rand() * 3),
      shelves: maybe(() =>
        Array.from({ length: Math.floor(rand() * 20) }, () => rand()),
      ),
      drawers: maybe(() => Math.floor(rand() * 15)),
      rod: rand() < 0.3,
      rodHeight: maybe(() => rand()),
      door: maybe(() => pick(doors)),
    })),
  });

  it("500 random drafts", () => {
    const failures: unknown[] = [];
    for (let i = 0; i < 500; i++) {
      const draft = randomDraft();
      const r = importWardrobeDraft(draft);
      const after = validateWardrobe(state());
      if (after.length > 0 || r.status === "fallback") {
        failures.push({
          draft,
          status: r.status,
          after,
          adjustments: codes(r),
        });
      }
    }
    expect(failures.slice(0, 3)).toEqual([]);
  });
});
