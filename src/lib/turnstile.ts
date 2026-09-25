import "server-only";

const SITEVERIFY_URL =
  "https://challenges.cloudflare.com/turnstile/v0/siteverify";

// A token solved on another site that embeds our public site key must not
// count; Vercel preview URLs and local dev are ours.
function isOwnHostname(hostname: string | undefined) {
  if (!hostname) return false;
  return (
    hostname === "ormanipomeri.com" ||
    hostname.endsWith(".ormanipomeri.com") ||
    hostname.endsWith(".vercel.app") ||
    hostname === "localhost"
  );
}

export type TurnstileResult = "ok" | "rejected" | "unavailable";

/**
 * Server-side Turnstile check. "rejected" means Cloudflare looked at the
 * token and refused it (tokens are single-use, so a replayed or
 * double-submitted one fails). "unavailable" means Cloudflare could not
 * answer: a timeout, a network error or its own internal error. One retry
 * reuses an idempotency key, which Cloudflare provides for exactly this.
 */
export async function checkTurnstile(
  token: string,
  remoteIp?: string,
): Promise<TurnstileResult> {
  const secret = process.env.TURNSTILE_SECRET_KEY;
  if (!secret || !token) return "rejected";

  const idempotencyKey = crypto.randomUUID();
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const response = await fetch(SITEVERIFY_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          secret,
          response: token,
          idempotency_key: idempotencyKey,
          ...(remoteIp && remoteIp !== "anonymous" && { remoteip: remoteIp }),
        }),
        signal: AbortSignal.timeout(3000),
      });
      if (response.status >= 500) continue;
      const data = (await response.json()) as {
        success?: boolean;
        hostname?: string;
        "error-codes"?: string[];
      };
      if (data["error-codes"]?.includes("internal-error")) continue;
      if (data.success !== true) return "rejected";
      // Cloudflare's test keys report example.com, so only production checks it.
      return process.env.NODE_ENV !== "production" ||
        isOwnHostname(data.hostname)
        ? "ok"
        : "rejected";
    } catch (error) {
      console.error("Turnstile verification failed:", error);
    }
  }
  return "unavailable";
}

/** Strict form of checkTurnstile: anything but a verified token fails. */
export async function verifyTurnstile(
  token: string,
  remoteIp?: string,
): Promise<boolean> {
  return (await checkTurnstile(token, remoteIp)) === "ok";
}
