import { beforeEach, describe, expect, it } from "vitest";
import { useShelfStore } from "../store";

const T = 0.018;

function addDoor(from: string, to: string = from) {
  const st = useShelfStore.getState();
  st.startDoorSelection(from);
  st.updateDoorSelectionDrag(to);
  st.endDoorSelection();
  useShelfStore.getState().setDoorForSelection("left");
}

describe("removing the shelf above a compartment", () => {
  beforeEach(() => {
    const st = useShelfStore.getState();
    st.resetToDefaults();
    st.setWidth(160);
    st.setHeight(200);
    useShelfStore.getState().setColumnShelfCount(0, 3, T);
  });

  it("removes only that shelf and keeps the others in place", () => {
    const before = useShelfStore.getState().columnHorizontalBoundaries[0];

    useShelfStore.getState().removeShelfAboveCompartment("A2");

    expect(useShelfStore.getState().columnHorizontalBoundaries[0]).toEqual([
      before[0],
      before[2],
    ]);
  });

  it("empties the merged compartment and moves the ones above down a number", () => {
    const st = useShelfStore.getState();
    st.setElementRowCount("A1", 0, 1);
    st.setElementRowCount("A2", 0, 2);
    st.setElementRowCount("A3", 0, 3);
    st.setElementRowCount("A4", 0, 4);
    st.toggleCompRod("A4");
    st.setElementRowCount("B1", 0, 1);
    const topBefore = useShelfStore.getState().elementConfigs.A4;
    expect(topBefore?.rowCounts[0]).toBeGreaterThan(0);

    useShelfStore.getState().removeShelfAboveCompartment("A2");

    const { elementConfigs, compartmentExtras } = useShelfStore.getState();
    expect(elementConfigs.A1?.rowCounts).toEqual([1]);
    expect(elementConfigs.A2?.rowCounts).toBeUndefined();
    expect(elementConfigs.A3).toEqual(topBefore);
    expect(elementConfigs.A4).toBeUndefined();
    expect(compartmentExtras.A3?.rod).toBe(true);
    expect(compartmentExtras.A4).toBeUndefined();
    expect(elementConfigs.B1?.rowCounts).toEqual([1]);
  });

  it("keeps doors below the merge and drops the rest of the column's doors", () => {
    addDoor("A1");
    addDoor("A3");
    addDoor("B1");

    useShelfStore.getState().removeShelfAboveCompartment("A2");

    expect(
      useShelfStore
        .getState()
        .doorGroups.flatMap((g) => g.compartments)
        .sort(),
    ).toEqual(["A1", "B1"]);
  });

  it("keeps the selected compartment pointing at the same space", () => {
    useShelfStore.getState().setSelectedCompartmentKey("A4");
    useShelfStore.getState().removeShelfAboveCompartment("A1");
    expect(useShelfStore.getState().selectedCompartmentKey).toBe("A3");

    useShelfStore.getState().setSelectedCompartmentKey("A2");
    useShelfStore.getState().removeShelfAboveCompartment("A1");
    expect(useShelfStore.getState().selectedCompartmentKey).toBe("A1");
  });

  it("does nothing for the top compartment", () => {
    const before = useShelfStore.getState().columnHorizontalBoundaries[0];
    useShelfStore.getState().removeShelfAboveCompartment("A4");
    expect(useShelfStore.getState().columnHorizontalBoundaries[0]).toEqual(
      before,
    );
  });

  it("removes top-module shelves but never the module split", () => {
    const st = useShelfStore.getState();
    st.setHeight(260);
    useShelfStore.getState().setColumnShelfCount(0, 2, T);
    useShelfStore.getState().setColumnTopModuleShelfCount(0, 1, T);
    const { columnModuleBoundaries } = useShelfStore.getState();
    expect(columnModuleBoundaries[0]).not.toBeNull();

    // A3 is the last bottom compartment: above it is the module split
    useShelfStore.getState().removeShelfAboveCompartment("A3");
    expect(useShelfStore.getState().columnTopModuleShelves[0]).toHaveLength(1);
    expect(useShelfStore.getState().columnHorizontalBoundaries[0]).toHaveLength(
      2,
    );

    // A4 is the first top-module compartment
    useShelfStore.getState().removeShelfAboveCompartment("A4");
    expect(useShelfStore.getState().columnTopModuleShelves[0]).toEqual([]);
    expect(useShelfStore.getState().columnModuleBoundaries[0]).toBe(
      columnModuleBoundaries[0],
    );
  });
});
