import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const send = vi.fn();
vi.mock("server-only", () => ({}));
vi.mock("../posthog-server", () => ({ getPostHogServer: () => null }));
vi.mock("resend", () => ({
  Resend: class {
    emails = { send };
  },
}));

const { sendEmail } = await import("../email-rate-limiter");

const email = { to: "kupac@example.com", subject: "Test", html: "<p>x</p>" };
const ok = { data: { id: "1" }, error: null };
const fail = (name: string, statusCode: number | null) => ({
  data: null,
  error: { name, statusCode, message: name },
});

async function run(promise: Promise<boolean>) {
  await vi.runAllTimersAsync();
  return promise;
}

beforeEach(() => {
  vi.useFakeTimers();
  send.mockReset();
  vi.spyOn(console, "error").mockImplementation(() => {});
});
afterEach(() => vi.useRealTimers());

describe("sendEmail", () => {
  it("retries Resend's rate limit and then succeeds", async () => {
    send
      .mockResolvedValueOnce(fail("rate_limit_exceeded", 429))
      .mockResolvedValueOnce(ok);
    expect(await run(sendEmail(email))).toBe(true);
    expect(send).toHaveBeenCalledTimes(2);
  });

  it("does not retry an address Resend rejects", async () => {
    send.mockResolvedValue(fail("validation_error", 422));
    expect(await run(sendEmail(email))).toBe(false);
    expect(send).toHaveBeenCalledTimes(1);
  });

  it("does not retry a network error without an idempotency key", async () => {
    send.mockResolvedValue(fail("application_error", null));
    expect(await run(sendEmail(email))).toBe(false);
    expect(send).toHaveBeenCalledTimes(1);
  });

  it("retries a network error when a key makes it safe, passing the key", async () => {
    send
      .mockResolvedValueOnce(fail("application_error", null))
      .mockRejectedValueOnce(new Error("socket hang up"))
      .mockResolvedValueOnce(ok);
    const keyed = { ...email, idempotencyKey: "order-invoice/abc" };
    expect(await run(sendEmail(keyed))).toBe(true);
    expect(send).toHaveBeenCalledTimes(3);
    expect(send.mock.calls[0][1]).toEqual({
      idempotencyKey: "order-invoice/abc",
    });
  });

  it("gives up after three tries and never throws", async () => {
    send.mockResolvedValue(fail("rate_limit_exceeded", 429));
    expect(await run(sendEmail(email))).toBe(false);
    expect(send).toHaveBeenCalledTimes(3);
  });
});
