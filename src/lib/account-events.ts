// A customer's saved designs and orders also change outside the account
// pages: the configurator saves a design, checkout places an order and
// rewrites the delivery address. Those places only say that it happened;
// the app shell (SessionSync) drops what the account pages have cached.

const listeners = new Set<() => void>();

export function onAccountChange(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function accountChanged() {
  for (const listener of listeners) listener();
}
