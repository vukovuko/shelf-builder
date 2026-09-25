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

/**
 * Server-side Turnstile check. Tokens are single-use, so a replayed or
 * double-submitted token fails. Network errors, timeouts and odd responses
 * count as failures.
 */
export async function verifyTurnstile(
  token: string,
  remoteIp?: string,
): Promise<boolean> {
  const secret = process.env.TURNSTILE_SECRET_KEY;
  if (!secret || !token) return false;

  try {
    const response = await fetch(SITEVERIFY_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        secret,
        response: token,
        ...(remoteIp && remoteIp !== "anonymous" && { remoteip: remoteIp }),
      }),
      signal: AbortSignal.timeout(5000),
    });
    const data = (await response.json()) as {
      success?: boolean;
      hostname?: string;
    };
    if (data.success !== true) return false;
    // Cloudflare's test keys report example.com, so only production checks it.
    return (
      process.env.NODE_ENV !== "production" || isOwnHostname(data.hostname)
    );
  } catch (error) {
    console.error("Turnstile verification failed:", error);
    return false;
  }
}
