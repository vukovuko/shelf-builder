import { getWardrobeSnapshot } from "./serializeWardrobe";
import { useShelfStore } from "./store";

/**
 * The configurator's work in progress, kept in this browser so a reload, a
 * sign-in or a closed tab doesn't lose it. It is the same snapshot
 * "Sačuvaj dizajn" stores, so whatever a saved design keeps, the draft keeps.
 */
const DRAFT_KEY = "ormani:design-draft";
const MAX_AGE_MS = 30 * 24 * 60 * 60 * 1000;
const SAVE_DELAY_MS = 400;

type Snapshot = ReturnType<typeof getWardrobeSnapshot>;
type Draft = { savedAt: number; snapshot: Snapshot };

export function readDesignDraft(): Draft | null {
  try {
    const raw = localStorage.getItem(DRAFT_KEY);
    if (!raw) return null;
    const draft = JSON.parse(raw) as Draft;
    if (!draft?.snapshot || Date.now() - draft.savedAt > MAX_AGE_MS) {
      localStorage.removeItem(DRAFT_KEY);
      return null;
    }
    return draft;
  } catch {
    return null;
  }
}

export function clearDesignDraft() {
  try {
    localStorage.removeItem(DRAFT_KEY);
  } catch {
    // Storage unavailable: there is nothing to clear.
  }
}

function sameSnapshot(a: Snapshot, b: Snapshot) {
  return (Object.keys(a) as (keyof Snapshot)[]).every(
    (key) => a[key] === b[key],
  );
}

/** Saves the design to the draft whenever it changes; returns the cleanup. */
export function autosaveDesignDraft(): () => void {
  let last = getWardrobeSnapshot();
  let timer: ReturnType<typeof setTimeout> | undefined;

  const write = () => {
    timer = undefined;
    try {
      const draft: Draft = { savedAt: Date.now(), snapshot: last };
      localStorage.setItem(DRAFT_KEY, JSON.stringify(draft));
    } catch {
      // Private mode or full storage: the design just isn't kept.
    }
  };
  // A reload right after a change would otherwise drop the pending save.
  const flush = () => {
    if (timer) {
      clearTimeout(timer);
      write();
    }
  };

  const unsubscribe = useShelfStore.subscribe((state) => {
    // Read-only previews of someone's order must not replace the draft.
    if (state.isPreviewMode) return;
    const next = getWardrobeSnapshot();
    // Most store updates are hover and selection, which aren't in the design.
    if (sameSnapshot(next, last)) return;
    last = next;
    clearTimeout(timer);
    timer = setTimeout(write, SAVE_DELAY_MS);
  });
  window.addEventListener("pagehide", flush);

  return () => {
    flush();
    window.removeEventListener("pagehide", flush);
    unsubscribe();
  };
}
