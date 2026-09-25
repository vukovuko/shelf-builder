import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
  // The default retries add ~4s before an unreachable Redis errors out.
  retry: { retries: 1, backoff: () => 100 },
});

// Strict: Auth/contact/checkout endpoints (5 req/min)
// Allows for typos, retries, but prevents brute force
export const strictRateLimit = new Ratelimit({
  redis,
  limiter: Ratelimit.fixedWindow(5, "1 m"),
  prefix: "ratelimit:strict",
  analytics: true,
});

// Standard: Wardrobe save/update endpoints (30 req/min)
// Auto-save triggers frequently, users make rapid changes
export const standardRateLimit = new Ratelimit({
  redis,
  limiter: Ratelimit.fixedWindow(30, "1 m"),
  prefix: "ratelimit:standard",
  analytics: true,
});

// External autocomplete: Google Places autocomplete (30 req/min)
// Users type fast, each keystroke can trigger request (with debounce)
export const autocompleteRateLimit = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(30, "1 m"),
  prefix: "ratelimit:autocomplete",
  analytics: true,
});

// External details: Google Places details (10 req/min)
// Triggered once when user selects an address suggestion
export const externalApiRateLimit = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(10, "1 m"),
  prefix: "ratelimit:external",
  analytics: true,
});

// Rules preview: configurator re-prices after every change (250ms debounce)
export const previewRateLimit = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(120, "1 m"),
  prefix: "ratelimit:preview",
  analytics: true,
});

// Helper to get identifier (IP address)
export function getIdentifier(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for");
  const ip = forwarded?.split(",")[0]?.trim() || "anonymous";
  return ip;
}

/**
 * Rate-limit check for customer-facing routes (checkout, contact, signup,
 * saves). If Redis is unreachable the request goes through: losing orders
 * is worse than a burst of spam, and Turnstile or auth still guards these.
 * Paid upstream calls use guardPaidRoute, which fails closed instead.
 */
export async function checkRateLimit(
  limiter: Ratelimit,
  identifier: string,
): Promise<Response | null> {
  try {
    const { success, reset } = await limiter.limit(identifier);
    return success ? null : rateLimitResponse(reset);
  } catch (error) {
    console.error("Rate limiter unavailable, allowing request:", error);
    return null;
  }
}

// Helper to create rate limit response (industry standard format)
export function rateLimitResponse(reset: number) {
  const retryAfter = Math.max(1, Math.ceil((reset - Date.now()) / 1000));
  return new Response(
    JSON.stringify({
      error: "Too Many Requests",
      message:
        "Prekoračili ste maksimalan broj zahteva. Molimo sačekajte pre ponovnog pokušaja.",
      retryAfter,
    }),
    {
      status: 429,
      headers: {
        "Content-Type": "application/json",
        "Retry-After": String(retryAfter),
        "X-RateLimit-Reset": String(Math.ceil(reset / 1000)),
      },
    },
  );
}

/**
 * Browsers tag every fetch with Sec-Fetch-Site. Anything but same-origin is
 * another site's page calling us with its visitors' IPs, which per-IP limits
 * cannot stop. Scripts can omit the header, so this complements the limits.
 */
export function isCrossSiteRequest(request: Request): boolean {
  const site = request.headers.get("sec-fetch-site");
  return site !== null && site !== "same-origin";
}

/**
 * Per-day ceiling shared by every visitor. Per-IP limits let a botnet scale
 * the bill with its IP count; this caps the worst day at a known amount.
 */
async function withinDailyBudget(name: string, perDay: number) {
  const key = `budget:${name}:${new Date().toISOString().slice(0, 10)}`;
  const used = await redis.incr(key);
  if (used === 1) await redis.expire(key, 60 * 60 * 48);
  return used <= perDay;
}

function unavailableResponse() {
  return new Response(
    JSON.stringify({
      error: "Service Unavailable",
      message: "Usluga trenutno nije dostupna. Pokušajte ponovo kasnije.",
    }),
    { status: 503, headers: { "Content-Type": "application/json" } },
  );
}

/**
 * Gate for routes that pay an upstream API per call. Returns a response to
 * send back when the call must not go through, or null to proceed. Unlike
 * the plain limiters it fails closed: a slow or broken Redis blocks the call
 * instead of letting it through unmetered.
 */
export async function guardPaidRoute(
  request: Request,
  limiter: Ratelimit,
  budget: { name: string; perDay: number },
): Promise<Response | null> {
  if (isCrossSiteRequest(request)) {
    return new Response(JSON.stringify({ error: "Forbidden" }), {
      status: 403,
      headers: { "Content-Type": "application/json" },
    });
  }
  try {
    const { success, reset, reason } = await limiter.limit(
      getIdentifier(request),
    );
    if (reason === "timeout") return unavailableResponse();
    if (!success) return rateLimitResponse(reset);
    if (!(await withinDailyBudget(budget.name, budget.perDay))) {
      console.error(`Daily budget reached for ${budget.name}`);
      return unavailableResponse();
    }
    return null;
  } catch (error) {
    console.error("Rate limiter unavailable:", error);
    return unavailableResponse();
  }
}
