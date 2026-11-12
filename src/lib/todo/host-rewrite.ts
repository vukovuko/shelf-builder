import { TODO_HOST } from "./host";

// On todo.ormanipomeri.com the address "/" shows the to-do board, which is
// the /todo-board route everywhere else.
const BOARD_PATH = "/todo-board";

function moved(url: URL, from: string, to: string): URL | undefined {
  if (url.host !== TODO_HOST || url.pathname !== from) return undefined;
  const next = new URL(url);
  next.pathname = to;
  return next;
}

/** Address the visitor asked for → the route that answers it. */
export const todoHostInput = ({ url }: { url: URL }) =>
  moved(url, "/", BOARD_PATH);

/** Route the router is on → the address the visitor sees. */
export const todoHostOutput = ({ url }: { url: URL }) =>
  moved(url, BOARD_PATH, "/");
