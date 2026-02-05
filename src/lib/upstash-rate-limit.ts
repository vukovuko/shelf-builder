import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
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
  limiter: Ratelimit.fixedWindow(30, "1 m"),
  prefix: "ratelimit:autocomplete",
  analytics: true,
});

// External details: Google Places details (20 req/min)
// Triggered when user selects an address suggestion
export const externalApiRateLimit = new Ratelimit({
  redis,
  limiter: Ratelimit.fixedWindow(20, "1 m"),
  prefix: "ratelimit:external",
  analytics: true,
});

// Helper to get identifier (IP address)
export function getIdentifier(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for");
  const ip = forwarded?.split(",")[0]?.trim() || "anonymous";
  return ip;
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
