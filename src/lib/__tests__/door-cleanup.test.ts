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

describe("doors follow the shelf layout", () => {
  beforeEach(() => {
    const st = useShelfStore.getState();
    st.resetToDefaults();
    st.setWidth(160);
    st.setHeight(200);
  });

  it("drops a column's doors when its shelf count changes", () => {
    useShelfStore.getState().setColumnShelfCount(0, 2, T);
    useShelfStore.getState().setColumnShelfCount(1, 2, T);
    addDoor("A1", "A2");
    addDoor("B1");
    expect(useShelfStore.getState().doorGroups).toHaveLength(2);

    useShelfStore.getState().setColumnShelfCount(0, 3, T);

    const { doorGroups, doorSelections } = useShelfStore.getState();
    expect(doorGroups.map((g) => g.column)).toEqual(["B"]);
    expect(Object.keys(doorSelections)).toEqual(["B1"]);
  });

  it("keeps doors when the shelf count stays the same", () => {
    useShelfStore.getState().setColumnShelfCount(0, 2, T);
    addDoor("A1");
    useShelfStore.getState().setColumnShelfCount(0, 2, T);
    expect(useShelfStore.getState().doorGroups).toHaveLength(1);
  });

  it("drops doors on spaces inside a compartment when its shelves change", () => {
    useShelfStore.getState().setElementRowCount("A1", 0, 2);
    addDoor("A1.0.1");
    addDoor("B1");

    useShelfStore.getState().setElementRowCount("A1", 0, 3);

    expect(
      useShelfStore.getState().doorGroups.flatMap((g) => g.compartments),
    ).toEqual(["B1"]);
  });
});
