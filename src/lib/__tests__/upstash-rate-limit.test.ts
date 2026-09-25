import type { Ratelimit } from "@upstash/ratelimit";
import { describe, expect, it } from "vitest";
import { checkRateLimit } from "../upstash-rate-limit";

const limiter = (limit: () => Promise<unknown>) =>
  ({ limit }) as unknown as Ratelimit;

describe("checkRateLimit", () => {
  it("lets the request through when Redis is unreachable", async () => {
    const down = limiter(() => Promise.reject(new Error("ENOTFOUND")));
    expect(await checkRateLimit(down, "1.2.3.4")).toBeNull();
  });

  it("returns 429 with Retry-After when the limit is hit", async () => {
    const full = limiter(async () => ({
      success: false,
      reset: Date.now() + 30_000,
    }));
    const res = await checkRateLimit(full, "1.2.3.4");
    expect(res?.status).toBe(429);
    expect(Number(res?.headers.get("Retry-After"))).toBeGreaterThan(0);
  });

  it("passes when under the limit", async () => {
    const ok = limiter(async () => ({ success: true, reset: 0 }));
    expect(await checkRateLimit(ok, "1.2.3.4")).toBeNull();
  });
});
