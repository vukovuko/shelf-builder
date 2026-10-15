import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  COMMIT_DELAY_MS,
  HISTORY_LIMIT,
  historyShortcut,
  redoDesign,
  startDesignHistory,
  undoDesign,
  useDesignHistory,
} from "../design-history";
import { useShelfStore } from "../store";

const store = () => useShelfStore.getState();
const settle = () => vi.advanceTimersByTime(COMMIT_DELAY_MS);

describe("design history", () => {
  let stop: () => void;

  beforeEach(() => {
    vi.useFakeTimers();
    vi.stubGlobal("window", {
      addEventListener: () => {},
      removeEventListener: () => {},
    });
    store().resetToDefaults();
    store().setWidth(200);
    stop = startDesignHistory();
  });

  afterEach(() => {
    stop();
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it("undoes and redoes a change", () => {
    store().setWidth(240);
    settle();
    undoDesign();
    expect(store().width).toBe(200);
    redoDesign();
    expect(store().width).toBe(240);
  });

  it("merges quick changes into one step", () => {
    store().setWidth(210);
    store().setWidth(220);
    store().setWidth(230);
    settle();
    undoDesign();
    expect(store().width).toBe(200);
  });

  it("undoes a change that hasn't settled yet", () => {
    store().setWidth(260);
    expect(useDesignHistory.getState().canUndo).toBe(true);
    undoDesign();
    expect(store().width).toBe(200);
  });

  it("records a drag as one step when it ends", () => {
    store().setIsDragging(true);
    store().setWidth(210);
    settle();
    store().setWidth(250);
    settle();
    store().setIsDragging(false);
    settle();
    undoDesign();
    expect(store().width).toBe(200);
    expect(useDesignHistory.getState().canUndo).toBe(false);
  });

  it("ignores updates that don't change the design", () => {
    store().setShowDoors(false);
    store().setWidth(200);
    settle();
    expect(useDesignHistory.getState().canUndo).toBe(false);
  });

  it("drops redo once a new change is made", () => {
    store().setWidth(240);
    settle();
    undoDesign();
    store().setHeight(220);
    settle();
    redoDesign();
    expect(store().width).toBe(200);
    expect(store().height).toBe(220);
  });

  it(`keeps at most ${HISTORY_LIMIT} steps`, () => {
    for (let i = 1; i <= HISTORY_LIMIT + 5; i++) {
      store().setWidth(200 + i);
      settle();
    }
    for (let i = 0; i < HISTORY_LIMIT + 5; i++) undoDesign();
    expect(store().width).toBe(205);
  });
});

describe("historyShortcut", () => {
  const press = (key: string, code: string, mods: Partial<KeyboardEvent>) =>
    historyShortcut({
      key,
      code,
      metaKey: false,
      ctrlKey: false,
      altKey: false,
      shiftKey: false,
      ...mods,
    });

  it("reads Mac and Windows shortcuts", () => {
    expect(press("z", "KeyZ", { metaKey: true })).toBe("undo");
    expect(press("z", "KeyZ", { ctrlKey: true })).toBe("undo");
    expect(press("Z", "KeyZ", { metaKey: true, shiftKey: true })).toBe("redo");
    expect(press("y", "KeyY", { ctrlKey: true })).toBe("redo");
    expect(press("z", "KeyZ", {})).toBeNull();
    expect(press("z", "KeyZ", { ctrlKey: true, altKey: true })).toBeNull();
  });

  it("follows the letter on Serbian QWERTZ, where Z sits on the Y key", () => {
    expect(press("z", "KeyY", { ctrlKey: true })).toBe("undo");
    expect(press("y", "KeyZ", { ctrlKey: true })).toBe("redo");
  });

  it("reads Serbian Cyrillic by the letter on the key", () => {
    expect(press("з", "KeyY", { ctrlKey: true })).toBe("undo");
    expect(press("З", "KeyY", { ctrlKey: true, shiftKey: true })).toBe("redo");
    expect(press("ѕ", "KeyZ", { ctrlKey: true })).toBe("redo");
  });

  it("falls back to the physical key on other layouts", () => {
    expect(press("я", "KeyZ", { ctrlKey: true })).toBe("undo");
  });
});
