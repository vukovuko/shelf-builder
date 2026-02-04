/**
 * Simple in-memory rate limiter for serverless environments.
 *
 * IMPORTANT: This is a per-instance limiter. In serverless (Vercel), each
 * function instance has its own memory, so limits are per-instance, not global.
 * This still provides meaningful protection against:
 * - Single IP hammering a single instance
 * - Accidental rapid-fire requests from buggy clients
 * - Basic DoS from single sources
 *
 * For true global rate limiting, use Upstash Redis or similar.
 */

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

// Store entries per identifier (IP address, user ID, etc.)
const rateLimitStore = new Map<string, RateLimitEntry>();

// Cleanup old entries periodically to prevent memory leaks
const CLEANUP_INTERVAL = 60 * 1000; // 1 minute
let lastCleanup = Date.now();

function cleanup() {
  const now = Date.now();
  if (now - lastCleanup < CLEANUP_INTERVAL) return;

  lastCleanup = now;
  for (const [key, entry] of rateLimitStore.entries()) {
    if (entry.resetAt < now) {
      rateLimitStore.delete(key);
    }
  }
}

export interface RateLimitConfig {
  /** Maximum number of requests allowed in the window */
  limit: number;
  /** Time window in seconds */
  windowSeconds: number;
}

export interface RateLimitResult {
  /** Whether the request is allowed */
  allowed: boolean;
  /** Number of remaining requests in current window */
  remaining: number;
  /** When the window resets (Unix timestamp in seconds) */
  resetAt: number;
  /** Total limit */
  limit: number;
}

/**
 * Check if a request should be rate limited.
 *
 * @param identifier - Unique identifier (e.g., IP address, user ID)
 * @param config - Rate limit configuration
 * @returns Rate limit result with allowed status and metadata
 *
 * @example
 * ```typescript
 * const ip = request.headers.get("x-forwarded-for") || "unknown";
 * const result = checkRateLimit(`checkout:${ip}`, { limit: 10, windowSeconds: 60 });
 *
 * if (!result.allowed) {
 *   return NextResponse.json(
 *     { error: "Previše zahteva. Pokušajte ponovo za minut." },
 *     {
 *       status: 429,
 *       headers: {
 *         "X-RateLimit-Limit": String(result.limit),
 *         "X-RateLimit-Remaining": String(result.remaining),
 *         "X-RateLimit-Reset": String(result.resetAt),
 *         "Retry-After": String(result.resetAt - Math.floor(Date.now() / 1000)),
 *       }
 *     }
 *   );
 * }
 * ```
 */
export function checkRateLimit(
  identifier: string,
  config: RateLimitConfig,
): RateLimitResult {
  cleanup();

  const now = Date.now();
  const windowMs = config.windowSeconds * 1000;
  const entry = rateLimitStore.get(identifier);

  // No existing entry or window expired - create new window
  if (!entry || entry.resetAt < now) {
    const resetAt = now + windowMs;
    rateLimitStore.set(identifier, { count: 1, resetAt });
    return {
      allowed: true,
      remaining: config.limit - 1,
      resetAt: Math.floor(resetAt / 1000),
      limit: config.limit,
    };
  }

  // Window still active
  const remaining = Math.max(0, config.limit - entry.count - 1);
  const allowed = entry.count < config.limit;

  if (allowed) {
    entry.count++;
  }

  return {
    allowed,
    remaining: allowed ? remaining : 0,
    resetAt: Math.floor(entry.resetAt / 1000),
    limit: config.limit,
  };
}

/**
 * Pre-configured rate limiters for common use cases.
 */
export const rateLimiters = {
  /** Checkout: 5 orders per minute per IP (generous for normal use) */
  checkout: (ip: string) =>
    checkRateLimit(`checkout:${ip}`, { limit: 5, windowSeconds: 60 }),

  /** Contact form: 3 messages per minute per IP */
  contact: (ip: string) =>
    checkRateLimit(`contact:${ip}`, { limit: 3, windowSeconds: 60 }),

  /** Wardrobe save: 20 saves per minute per user (auto-save friendly) */
  wardrobeSave: (userId: string) =>
    checkRateLimit(`wardrobe:${userId}`, { limit: 20, windowSeconds: 60 }),

  /** Auth attempts: 5 per minute per IP (login, register, password reset) */
  auth: (ip: string) =>
    checkRateLimit(`auth:${ip}`, { limit: 5, windowSeconds: 60 }),

  /** API general: 100 requests per minute per IP */
  api: (ip: string) =>
    checkRateLimit(`api:${ip}`, { limit: 100, windowSeconds: 60 }),
};

/**
 * Helper to get client IP from request headers.
 * Works with Vercel's x-forwarded-for header.
 */
export function getClientIp(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) {
    // x-forwarded-for can be comma-separated list, take first (original client)
    return forwarded.split(",")[0].trim();
  }
  return request.headers.get("x-real-ip") || "unknown";
}
