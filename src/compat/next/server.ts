import { waitUntil } from "cloudflare:workers";

// Stands in for `next/server` while API handlers are shared with the Next.js
// app on `main`. Only what those handlers use is here.

interface CookieOptions {
  path?: string;
  maxAge?: number;
  httpOnly?: boolean;
  secure?: boolean;
  sameSite?: "lax" | "strict" | "none";
}

export class NextResponse extends Response {
  static json(data: unknown, init?: ResponseInit): NextResponse {
    const headers = new Headers(init?.headers);
    if (!headers.has("content-type")) {
      headers.set("content-type", "application/json");
    }
    return new NextResponse(JSON.stringify(data), { ...init, headers });
  }

  static redirect(url: string | URL, status = 307): NextResponse {
    return new NextResponse(null, {
      status,
      headers: { Location: String(url) },
    });
  }

  /** Sets (or, with maxAge 0, clears) a cookie on this response. */
  get cookies() {
    return {
      set: (name: string, value: string, options: CookieOptions = {}) => {
        const parts = [`${name}=${encodeURIComponent(value)}`];
        if (options.path) parts.push(`Path=${options.path}`);
        if (options.maxAge !== undefined) {
          parts.push(`Max-Age=${options.maxAge}`);
        }
        if (options.httpOnly) parts.push("HttpOnly");
        // Browsers ignore a "__Secure-" cookie that is not marked Secure.
        if (options.secure || name.startsWith("__Secure-")) {
          parts.push("Secure");
        }
        if (options.sameSite) parts.push(`SameSite=${options.sameSite}`);
        this.headers.append("Set-Cookie", parts.join("; "));
      },
    };
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
