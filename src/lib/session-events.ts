// Lets the app shell hear about sign-in, sign-out and profile changes without
// importing the auth client, which only pages with a sign-in form load.

const listeners = new Set<() => void>();

export function onSessionChange(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function emitSessionChange() {
  for (const listener of listeners) listener();
}
