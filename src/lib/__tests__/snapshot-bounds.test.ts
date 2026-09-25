import { describe, expect, it } from "vitest";
import { getWardrobeSnapshot } from "../serializeWardrobe";
import { snapshotBoundsError } from "../snapshot-bounds";
import { useShelfStore } from "../store";

describe("snapshotBoundsError", () => {
  it("accepts the configurator's own snapshot", () => {
    const st = useShelfStore.getState();
    st.resetToDefaults();
    st.setWidth(400);
    st.setHeight(280);
    st.setColumnShelfCount(0, 14, 0.018);
    st.setElementColumns("A1", 8);
    expect(snapshotBoundsError(getWardrobeSnapshot())).toBeNull();
  });

  it("accepts legacy single-number shelf positions and padded nulls", () => {
    expect(
      snapshotBoundsError({
        width: "210",
        columnHorizontalBoundaries: { 0: 1.2 },
        columnModuleBoundaries: { 0: null },
        elementConfigs: { A1: { columns: 2, rowCounts: [0, null] } },
      }),
    ).toBeNull();
  });

  it.each([
    [{ elementConfigs: { A1: { columns: 2_000_000_000 } } }, "elementConfigs"],
    [{ elementConfigs: { A1: { rowCounts: [1e9] } } }, "elementConfigs"],
    [{ width: 1e9 }, "width"],
    [{ height: Number.NaN }, "height"],
    [{ verticalBoundaries: Array(5000).fill(0) }, "verticalBoundaries"],
    [{ compartmentExtras: { A1: { drawersCount: 1e7 } } }, "compartmentExtras"],
    [
      { doorGroups: [{ compartments: Array(10_000).fill("A1") }] },
      "doorGroups",
    ],
    ["not an object", "snapshot"],
  ])("rejects %j", (snapshot, field) => {
    expect(snapshotBoundsError(snapshot)).toBe(field);
  });
});
