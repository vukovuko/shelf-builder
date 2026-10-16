import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  HISTORY_LIMIT,
  TYPING_COMMIT_MS,
  historyShortcut,
  redoDesign,
  startDesignHistory,
  undoDesign,
  useDesignHistory,
} from "../design-history";
import { useShelfStore } from "../store";

const store = () => useShelfStore.getState();
// Lets the step of the current event close (it commits on setTimeout 0).
const endOfEvent = () => vi.advanceTimersByTime(0);

describe("design history", () => {
  let stop: () => void;
  let listeners: Record<string, (e: unknown) => void>;
  const pointer = (type: string, buttons = 0) =>
    listeners[type]({ pointerId: 1, buttons });

  beforeEach(() => {
    vi.useFakeTimers();
    listeners = {};
    vi.stubGlobal("window", {
      addEventListener: (type: string, listener: (e: unknown) => void) => {
        listeners[type] = listener;
      },
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
    endOfEvent();
    undoDesign();
    expect(store().width).toBe(200);
    redoDesign();
    expect(store().width).toBe(240);
  });

  it("undoes five changes one at a time, with hover updates in between", () => {
    for (const width of [210, 220, 230, 240, 250]) {
      store().setWidth(width);
      // Moving the mouse over the model updates the store all the time.
      store().setShowDoors(width % 20 === 0);
      store().setShowDoors(width % 20 !== 0);
      endOfEvent();
    }
    for (const width of [240, 230, 220, 210, 200]) {
      undoDesign();
      expect(store().width).toBe(width);
    }
    expect(useDesignHistory.getState().canUndo).toBe(false);
  });

  it("keeps one action that sets several things as one step", () => {
    store().setWidth(260);
    store().setHeight(230);
    endOfEvent();
    undoDesign();
    expect(store().width).toBe(200);
    expect(store().height).not.toBe(230);
  });

  it("undoes a change before its event has finished", () => {
    store().setWidth(260);
    expect(useDesignHistory.getState().canUndo).toBe(true);
    undoDesign();
    expect(store().width).toBe(200);
  });

  it("records a press-and-drag as one step when released", () => {
    pointer("pointerdown", 1);
    store().setWidth(210);
    vi.advanceTimersByTime(2000);
    store().setWidth(250);
    vi.advanceTimersByTime(2000);
    pointer("pointerup");
    endOfEvent();
    undoDesign();
    expect(store().width).toBe(200);
    expect(useDesignHistory.getState().canUndo).toBe(false);
  });

  it("ends a drag released outside the window on the next move", () => {
    pointer("pointerdown", 1);
    store().setWidth(230);
    pointer("pointermove", 0);
    endOfEvent();
    store().setWidth(240);
    endOfEvent();
    undoDesign();
    expect(store().width).toBe(230);
  });

  it("waits for a pause before closing a typed number", () => {
    class FakeElement {
      isContentEditable = false;
    }
    class FakeInput extends FakeElement {
      type = "number";
    }
    vi.stubGlobal("HTMLElement", FakeElement);
    vi.stubGlobal("HTMLInputElement", FakeInput);
    vi.stubGlobal("HTMLTextAreaElement", class {});
    vi.stubGlobal("document", { activeElement: new FakeInput() });

    store().setWidth(201);
    endOfEvent();
    store().setWidth(215);
    endOfEvent();
    store().setWidth(215.5);
    vi.advanceTimersByTime(TYPING_COMMIT_MS);
    undoDesign();
    expect(store().width).toBe(200);
  });

  it("ignores updates that don't change the design", () => {
    store().setShowDoors(false);
    store().setWidth(200);
    endOfEvent();
    expect(useDesignHistory.getState().canUndo).toBe(false);
  });

  it("drops redo once a new change is made", () => {
    store().setWidth(240);
    endOfEvent();
    undoDesign();
    store().setHeight(220);
    endOfEvent();
    redoDesign();
    expect(store().width).toBe(200);
    expect(store().height).toBe(220);
  });

  it(`keeps at most ${HISTORY_LIMIT} steps`, () => {
    for (let i = 1; i <= HISTORY_LIMIT + 5; i++) {
      store().setWidth(200 + i);
      endOfEvent();
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
