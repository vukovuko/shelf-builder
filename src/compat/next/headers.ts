import { getRequestHeaders } from "@tanstack/react-start/server";

// Stands in for `next/headers` while API handlers and server helpers are
// shared with the Next.js app on `main`.

/** The headers of the request being handled. */
export async function headers(): Promise<Headers> {
  return getRequestHeaders() as unknown as Headers;
}
