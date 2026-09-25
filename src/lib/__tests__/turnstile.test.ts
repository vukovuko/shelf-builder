import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
const { checkTurnstile } = await import("../turnstile");

const fetchMock = vi.fn();
const reply = (body: unknown, status = 200) =>
  Promise.resolve(new Response(JSON.stringify(body), { status }));

beforeEach(() => {
  vi.stubGlobal("fetch", fetchMock);
  vi.stubEnv("TURNSTILE_SECRET_KEY", "secret");
  fetchMock.mockReset();
  vi.spyOn(console, "error").mockImplementation(() => {});
});
afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

describe("checkTurnstile", () => {
  it("accepts a token Cloudflare verifies", async () => {
    fetchMock.mockReturnValueOnce(reply({ success: true }));
    expect(await checkTurnstile("token")).toBe("ok");
  });

  it("rejects a token Cloudflare refuses, without retrying", async () => {
    fetchMock.mockReturnValueOnce(
      reply({ success: false, "error-codes": ["timeout-or-duplicate"] }),
    );
    expect(await checkTurnstile("token")).toBe("rejected");
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("rejects a missing token without calling Cloudflare", async () => {
    expect(await checkTurnstile("")).toBe("rejected");
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("retries once with the same idempotency key, then succeeds", async () => {
    fetchMock
      .mockRejectedValueOnce(new Error("timeout"))
      .mockReturnValueOnce(reply({ success: true }));
    expect(await checkTurnstile("token")).toBe("ok");
    const keys = fetchMock.mock.calls.map(
      ([, init]) => JSON.parse(init.body).idempotency_key,
    );
    expect(keys[0]).toBeTruthy();
    expect(keys[1]).toBe(keys[0]);
  });

  it("reports Cloudflare as unavailable after network errors or its own errors", async () => {
    fetchMock
      .mockReturnValueOnce(reply({}, 503))
      .mockReturnValueOnce(
        reply({ success: false, "error-codes": ["internal-error"] }),
      );
    expect(await checkTurnstile("token")).toBe("unavailable");
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });
});
