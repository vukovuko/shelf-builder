import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";
import { rateLimitKey } from "./rate-limit-key";

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
  // The default retries add ~4s before an unreachable Redis errors out, and
  // a hung request would otherwise hold the page until the function times out.
  retry: { retries: 1, backoff: () => 100 },
  signal: () => AbortSignal.timeout(1000),
});

// Upstash answers in ~10 ms from fra1. After this long a limiter stops
// waiting: customer routes let the request through, paid routes refuse it.
const timeout = 500;

// Per-IP limits are only a loose outer cap: one Serbian mobile or home IP is
// often shared by many people (carrier-grade NAT), and a shared cap must
// never stop a real buyer. Turnstile gates each form submission, and the
// checkout counts per account when the buyer is logged in. Each form has
// its own counter, so contact messages never use up a visitor's checkout.
export const checkoutRateLimit = new Ratelimit({
  redis,
  limiter: Ratelimit.fixedWindow(10, "1 m"),
  prefix: "ratelimit:checkout",
  analytics: true,
  timeout,
});

// Shared by both contact forms: the same action on two pages.
export const contactRateLimit = new Ratelimit({
  redis,
  limiter: Ratelimit.fixedWindow(10, "1 m"),
  prefix: "ratelimit:contact",
  analytics: true,
  timeout,
});

export const signupRateLimit = new Ratelimit({
  redis,
  limiter: Ratelimit.fixedWindow(10, "1 m"),
  prefix: "ratelimit:signup",
  analytics: true,
  timeout,
});

// Standard: Wardrobe save/update endpoints (30 req/min)
// Auto-save triggers frequently, users make rapid changes
export const standardRateLimit = new Ratelimit({
  redis,
  limiter: Ratelimit.fixedWindow(30, "1 m"),
  prefix: "ratelimit:standard",
  analytics: true,
  timeout,
});

// Google Places autocomplete, per IP. Typing fires a request per pause, and
// several buyers can share one IP; the daily budget is the cost ceiling.
export const autocompleteRateLimit = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(60, "1 m"),
  prefix: "ratelimit:autocomplete",
  analytics: true,
  timeout,
});

// Google Places details: one call per picked suggestion.
export const externalApiRateLimit = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(20, "1 m"),
  prefix: "ratelimit:external",
  analytics: true,
  timeout,
});

// Photo/sketch import: each call is a paid Claude request. Per account per
// day, a burst cap per account, and a daily cap per IP so one person can't
// multiply their allowance with extra accounts.
export const designImportRateLimit = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(10, "1 d"),
  prefix: "ratelimit:design-import",
  timeout,
});

export const designImportBurstLimit = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(3, "1 m"),
  prefix: "ratelimit:design-import-burst",
  timeout,
});

export const designImportIpLimit = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(30, "1 d"),
  prefix: "ratelimit:design-import-ip",
  timeout,
});

// Rules preview: the configurator re-prices after every change (250 ms
// debounce), keyed by account when logged in, else by IP.
export const previewRateLimit = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(300, "1 m"),
  prefix: "ratelimit:preview",
  analytics: true,
  timeout,
});

// Per-recipient caps: however many IPs trigger them, one inbox gets at most
// this many auth emails (verification, password reset) and order emails.
const authEmailLimit = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(5, "1 h"),
  prefix: "ratelimit:email-auth",
  timeout,
});

const orderEmailLimit = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(10, "1 d"),
  prefix: "ratelimit:email-order",
  timeout,
});

// Saving designs is login-only, so the limit follows the account, not the IP.
export const wardrobeSaveRateLimit = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(30, "1 m"),
  prefix: "ratelimit:wardrobe-save",
  timeout,
});

/**
 * Whether another email of this kind may go to this address. If Redis is
 * unreachable the email is sent: losing a real verification or order email
 * is worse than a burst of spam.
 */
export async function allowEmailTo(
  address: string,
  kind: "auth" | "order",
): Promise<boolean> {
  const limiter = kind === "auth" ? authEmailLimit : orderEmailLimit;
  try {
    const { success } = await limiter.limit(address.trim().toLowerCase());
    if (!success) console.warn(`Email cap reached (${kind}) for ${address}`);
    return success;
  } catch (error) {
    console.error("Email cap unavailable, sending anyway:", error);
    return true;
  }
}

type AuthRateLimitEntry = { key: string; count: number; lastRequest: number };

/**
 * Storage for Better Auth's built-in limiter. Its default keeps counts in
 * memory, i.e. per serverless instance, which does not limit anything.
 */
export const betterAuthRateLimitStorage = {
  async get(key: string): Promise<AuthRateLimitEntry | undefined> {
    try {
      return (
        (await redis.get<AuthRateLimitEntry>(`ratelimit:auth:${key}`)) ??
        undefined
      );
    } catch {
      return undefined;
    }
  },
  async set(key: string, value: AuthRateLimitEntry) {
    try {
      await redis.set(`ratelimit:auth:${key}`, value, { ex: 60 * 60 * 24 });
    } catch {
      // Unreachable Redis: the request goes through unlimited.
    }
  },
  /**
   * Atomic count-and-check, which Better Auth prefers over get/set: without
   * it, simultaneous requests can each read the same count and all pass.
   */
  async consume(key: string, rule: { window: number; max: number }) {
    const redisKey = `ratelimit:auth-window:${key}`;
    try {
      const [count] = await redis
        .multi()
        .incr(redisKey)
        .expire(redisKey, rule.window, "NX")
        .exec<[number, number]>();
      if (count <= rule.max) return { allowed: true, retryAfter: null };
      const ttl = await redis.ttl(redisKey);
      return { allowed: false, retryAfter: ttl > 0 ? ttl : rule.window };
    } catch {
      return { allowed: true, retryAfter: null };
    }
  },
};

/**
 * The client's IP address, exact (Turnstile checks it as is). The limiters
 * group it further via rateLimitKey.
 */
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
    const { success, reset } = await limiter.limit(rateLimitKey(identifier));
    return success ? null : rateLimitResponse(reset);
  } catch (error) {
    console.error("Rate limiter unavailable, allowing request:", error);
    return null;
  }
}

// 429 with Retry-After (RFC 6585). Clients show `error` to the visitor.
export function rateLimitResponse(reset: number) {
  const retryAfter = Math.max(1, Math.ceil((reset - Date.now()) / 1000));
  const message =
    retryAfter > 90
      ? "Previše zahteva. Pokušajte ponovo malo kasnije."
      : `Previše zahteva. Pokušajte ponovo za ${retryAfter} s.`;
  return new Response(JSON.stringify({ error: message, message, retryAfter }), {
    status: 429,
    headers: {
      "Content-Type": "application/json",
      "Retry-After": String(retryAfter),
      "X-RateLimit-Reset": String(Math.ceil(reset / 1000)),
    },
  });
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
  const message = "Usluga trenutno nije dostupna. Pokušajte ponovo kasnije.";
  return new Response(JSON.stringify({ error: message, message }), {
    status: 503,
    headers: { "Content-Type": "application/json" },
  });
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
  identifier: string = getIdentifier(request),
): Promise<Response | null> {
  if (isCrossSiteRequest(request)) {
    return new Response(JSON.stringify({ error: "Forbidden" }), {
      status: 403,
      headers: { "Content-Type": "application/json" },
    });
  }
  try {
    const { success, reset, reason } = await limiter.limit(
      rateLimitKey(identifier),
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

/**
 * Checkout idempotency: the response of a placed order, stored under the
 * key the checkout dialog generates. A retry after a dropped connection gets
 * the same order back instead of placing a second one. Without Redis the
 * retry is treated as a new order, as before.
 */
const CHECKOUT_REPLAY_SECONDS = 60 * 60 * 24;

export async function recallCheckout(key: string): Promise<unknown | null> {
  try {
    return await redis.get(`checkout:done:${key}`);
  } catch {
    return null;
  }
}

export async function rememberCheckout(key: string, response: unknown) {
  try {
    await redis.set(`checkout:done:${key}`, response, {
      ex: CHECKOUT_REPLAY_SECONDS,
    });
  } catch (error) {
    console.error("Could not store checkout idempotency key:", error);
  }
}

/**
 * Sketch import memory. The same image (by content hash) gets the reading
 * it got before, without another paid call; a re-upload after "Vrati
 * prethodni" costs nothing, and neither does a bot resending one file.
 */
const DESIGN_IMPORT_CACHE_SECONDS = 60 * 60 * 24 * 7;

export async function recallDesignImport(hash: string): Promise<unknown> {
  try {
    return await redis.get(`design-import:draft:${hash}`);
  } catch {
    return null;
  }
}

export async function rememberDesignImport(hash: string, draft: unknown) {
  try {
    await redis.set(`design-import:draft:${hash}`, draft, {
      ex: DESIGN_IMPORT_CACHE_SECONDS,
    });
  } catch {
    // The next upload of this image just pays again.
  }
}

/**
 * Uploads today that showed no wardrobe. Real users rarely send more than
 * one or two; someone feeding random pictures gets paused for the day.
 */
function junkKey(userId: string) {
  return `design-import:junk:${userId}:${new Date().toISOString().slice(0, 10)}`;
}

export async function designImportJunkCount(userId: string): Promise<number> {
  try {
    return (await redis.get<number>(junkKey(userId))) ?? 0;
  } catch {
    return 0;
  }
}

export async function addDesignImportJunk(userId: string) {
  try {
    const key = junkKey(userId);
    const n = await redis.incr(key);
    if (n === 1) await redis.expire(key, 60 * 60 * 48);
  } catch {
    // Without Redis the per-account and global limits still apply.
  }
}
