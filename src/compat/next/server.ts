import { waitUntil } from "cloudflare:workers";

// Stands in for `next/server` while API handlers are shared with the Next.js
// app on `main`. Only what those handlers use is here.

export class NextResponse extends Response {
  static json(data: unknown, init?: ResponseInit): NextResponse {
    return Response.json(data, init) as NextResponse;
  }

  static redirect(url: string | URL, status = 307): NextResponse {
    return Response.redirect(String(url), status) as NextResponse;
  }
}

export class NextRequest extends Request {
  get nextUrl(): URL {
    return new URL(this.url);
  }
}

/** Runs work after the response is sent; the Worker stays alive for it. */
export function after(task: (() => unknown) | Promise<unknown>): void {
  waitUntil(Promise.resolve(typeof task === "function" ? task() : task));
}
