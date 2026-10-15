import { create } from "zustand";
import { getWardrobeSnapshot } from "./serializeWardrobe";
import { useShelfStore } from "./store";

/**
 * Undo and redo for the configurator.
 *
 * Every history entry is a whole design snapshot, the same object
 * "Sačuvaj dizajn" stores. The store never mutates state in place, so a
 * snapshot only holds references to slices that already exist and an entry
 * costs almost nothing; undo puts those references straight back.
 *
 * A change becomes one undo step once the design has been still for
 * COMMIT_DELAY_MS and nothing is being dragged. A shelf drag, a slider pull or
 * typing "150" into a field therefore undoes in one go.
 */
export const HISTORY_LIMIT = 100;
export const COMMIT_DELAY_MS = 500;

type Snapshot = ReturnType<typeof getWardrobeSnapshot>;

let past: Snapshot[] = [];
let future: Snapshot[] = [];
// The design as of the last committed step; undo returns to the entry before it.
let baseline: Snapshot | null = null;
let pending = false;
let timer: ReturnType<typeof setTimeout> | undefined;

export const useDesignHistory = create(() => ({
  canUndo: false,
  canRedo: false,
}));

function publish() {
  useDesignHistory.setState({
    canUndo: past.length > 0 || pending,
    canRedo: future.length > 0 && !pending,
  });
}

function sameRefs(a: Snapshot, b: Snapshot) {
  return (Object.keys(a) as (keyof Snapshot)[]).every(
    (key) => a[key] === b[key],
  );
}

// Some actions rebuild an object with the same content; those aren't steps.
function sameDesign(a: Snapshot, b: Snapshot) {
  return sameRefs(a, b) || JSON.stringify(a) === JSON.stringify(b);
}

function commit() {
  clearTimeout(timer);
  timer = undefined;
  pending = false;
  const current = getWardrobeSnapshot();
  if (baseline && !sameDesign(current, baseline)) {
    past.push(baseline);
    if (past.length > HISTORY_LIMIT) past.shift();
    future = [];
  }
  baseline = current;
  publish();
}

function onStoreChange() {
  const state = useShelfStore.getState();
  if (state.isPreviewMode || !baseline) return;
  if (sameRefs(getWardrobeSnapshot(), baseline)) return;
  clearTimeout(timer);
  timer = undefined;
  pending = true;
  // The step is committed when the drag ends (that update lands here too).
  if (!state.isDragging) timer = setTimeout(commit, COMMIT_DELAY_MS);
  publish();
}

function restore(snapshot: Snapshot) {
  baseline = snapshot;
  useShelfStore.setState({
    ...snapshot,
    // A door selection can name compartments the restored design doesn't have.
    selectedDoorCompartments: [],
    doorSelectionDragging: false,
    doorSelectionStart: null,
    doorSelectionCurrent: null,
  });
  publish();
}

function canTravel() {
  const state = useShelfStore.getState();
  return baseline !== null && !state.isDragging && !state.isPreviewMode;
}

export function undoDesign() {
  if (!canTravel()) return;
  // A change still waiting to be committed is the step the customer means.
  if (pending) commit();
  const target = past.pop();
  if (!target || !baseline) return;
  future.push(baseline);
  restore(target);
}

export function redoDesign() {
  if (!canTravel()) return;
  if (pending) commit();
  const target = future.pop();
  if (!target || !baseline) return;
  past.push(baseline);
  restore(target);
}

/** Forgets all steps; the current design becomes the starting point. */
export function resetDesignHistory() {
  clearTimeout(timer);
  timer = undefined;
  pending = false;
  past = [];
  future = [];
  baseline = getWardrobeSnapshot();
  publish();
}

type KeyInput = Pick<
  KeyboardEvent,
  "key" | "code" | "metaKey" | "ctrlKey" | "altKey" | "shiftKey"
>;

// Serbian Cyrillic puts з on the key printed Z and ѕ on the key printed Y.
const SERBIAN_CYRILLIC: Record<string, string> = { з: "z", ѕ: "y" };

/**
 * Which history shortcut a key press is: ⌘Z / Ctrl+Z undo, ⇧⌘Z / Ctrl+Shift+Z
 * and Ctrl+Y redo. Matched by the letter the layout types, so Serbian QWERTZ
 * (Z and Y swapped against US keyboards) and Serbian Cyrillic both work; any
 * other layout falls back to the physical key.
 */
export function historyShortcut(e: KeyInput): "undo" | "redo" | null {
  if (!(e.metaKey || e.ctrlKey) || e.altKey) return null;
  const typed = e.key.toLowerCase();
  const letter = /^[a-z]$/.test(typed)
    ? typed
    : (SERBIAN_CYRILLIC[typed] ?? e.code.replace(/^Key/, "").toLowerCase());
  if (letter === "z") return e.shiftKey ? "redo" : "undo";
  if (letter === "y" && e.ctrlKey && !e.metaKey && !e.shiftKey) return "redo";
  return null;
}

const TEXT_INPUT_TYPES = new Set([
  "text",
  "number",
  "email",
  "search",
  "tel",
  "url",
  "password",
]);

// Text fields keep the browser's own undo for what was typed.
function isTextEditing(target: EventTarget | null) {
  if (!(target instanceof HTMLElement)) return false;
  if (target.isContentEditable || target instanceof HTMLTextAreaElement) {
    return true;
  }
  return (
    target instanceof HTMLInputElement && TEXT_INPUT_TYPES.has(target.type)
  );
}

function onKeyDown(e: KeyboardEvent) {
  const action = historyShortcut(e);
  if (!action || isTextEditing(e.target)) return;
  // Checkout, save and other dialogs sit over the design; don't change it behind them.
  if (document.querySelector('[role="dialog"][aria-modal="true"]')) return;
  e.preventDefault();
  if (action === "undo") undoDesign();
  else redoDesign();
}

/** Starts recording steps from the current design; returns the cleanup. */
export function startDesignHistory(): () => void {
  resetDesignHistory();
  const unsubscribe = useShelfStore.subscribe(onStoreChange);
  window.addEventListener("keydown", onKeyDown);
  return () => {
    unsubscribe();
    window.removeEventListener("keydown", onKeyDown);
    clearTimeout(timer);
    timer = undefined;
    pending = false;
    baseline = null;
    past = [];
    future = [];
    publish();
  };
}
