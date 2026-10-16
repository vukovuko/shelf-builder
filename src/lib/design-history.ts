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
 * One user action is one step:
 * - a click, tap or key press: everything it changed, closed at the end of
 *   that event (setTimeout 0, so an action that calls several store setters
 *   is still one step);
 * - a press-and-drag (shelf, divider, slider): closed when the last pointer is
 *   released;
 * - typing into a number field: closed when the field loses focus or after
 *   TYPING_COMMIT_MS without a keystroke, so "150" isn't three steps.
 * Hover and selection updates never touch the design and are ignored.
 */
export const HISTORY_LIMIT = 100;
export const TYPING_COMMIT_MS = 800;

type Snapshot = ReturnType<typeof getWardrobeSnapshot>;

let past: Snapshot[] = [];
let future: Snapshot[] = [];
// The design as of the last committed step; undo returns to the entry before it.
let baseline: Snapshot | null = null;
// The design the subscriber saw last, to tell design changes from hover noise.
let latest: Snapshot | null = null;
let pending = false;
let timer: ReturnType<typeof setTimeout> | undefined;
const pressedPointers = new Set<number>();

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
  latest = current;
  publish();
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
function isTextEditing(target: unknown) {
  if (typeof HTMLElement === "undefined") return false;
  if (!(target instanceof HTMLElement)) return false;
  if (target.isContentEditable || target instanceof HTMLTextAreaElement) {
    return true;
  }
  return (
    target instanceof HTMLInputElement && TEXT_INPUT_TYPES.has(target.type)
  );
}

/** Closes the pending step once the action that made it is over. */
function settle() {
  if (!pending || pressedPointers.size > 0) return;
  const typing =
    typeof document !== "undefined" && isTextEditing(document.activeElement);
  clearTimeout(timer);
  timer = setTimeout(commit, typing ? TYPING_COMMIT_MS : 0);
}

function onStoreChange() {
  if (useShelfStore.getState().isPreviewMode || !baseline) return;
  const current = getWardrobeSnapshot();
  if (latest && sameRefs(current, latest)) return;
  latest = current;
  pending = true;
  publish();
  settle();
}

function restore(snapshot: Snapshot) {
  clearTimeout(timer);
  timer = undefined;
  pending = false;
  baseline = snapshot;
  latest = snapshot;
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
  return (
    baseline !== null &&
    pressedPointers.size === 0 &&
    !state.isDragging &&
    !state.isPreviewMode
  );
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
  latest = baseline;
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

function onKeyDown(e: KeyboardEvent) {
  const action = historyShortcut(e);
  if (!action || isTextEditing(e.target)) return;
  // Checkout, save and other dialogs sit over the design; don't change it behind them.
  if (document.querySelector('[role="dialog"][aria-modal="true"]')) return;
  e.preventDefault();
  if (action === "undo") undoDesign();
  else redoDesign();
}

function onPointerDown(e: PointerEvent) {
  pressedPointers.add(e.pointerId);
}

function onPointerUp(e: PointerEvent) {
  pressedPointers.delete(e.pointerId);
  settle();
}

// A release outside the window never sends pointerup; the next move does
// arrive with no buttons pressed.
function onPointerMove(e: PointerEvent) {
  if (e.buttons === 0 && pressedPointers.delete(e.pointerId)) settle();
}

// Leaving a number field ends the typing step right away.
function onFocusOut() {
  setTimeout(settle, 0);
}

const LISTENERS = [
  ["keydown", onKeyDown],
  ["pointerdown", onPointerDown],
  ["pointerup", onPointerUp],
  ["pointercancel", onPointerUp],
  ["pointermove", onPointerMove],
  ["focusout", onFocusOut],
] as const;

/** Starts recording steps from the current design; returns the cleanup. */
export function startDesignHistory(): () => void {
  resetDesignHistory();
  pressedPointers.clear();
  const unsubscribe = useShelfStore.subscribe(onStoreChange);
  for (const [type, listener] of LISTENERS) {
    window.addEventListener(type, listener as EventListener, true);
  }
  return () => {
    unsubscribe();
    for (const [type, listener] of LISTENERS) {
      window.removeEventListener(type, listener as EventListener, true);
    }
    clearTimeout(timer);
    timer = undefined;
    pending = false;
    baseline = null;
    latest = null;
    past = [];
    future = [];
    pressedPointers.clear();
    publish();
  };
}
