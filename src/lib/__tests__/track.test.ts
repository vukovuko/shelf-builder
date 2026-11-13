import { beforeEach, describe, expect, it, vi } from "vitest";

// The module reads the key once when it loads, so each case loads it afresh.
async function loadTrack(key: string) {
  vi.resetModules();
  vi.stubEnv("NEXT_PUBLIC_POSTHOG_KEY", key);
  return import("../track");
}

describe("track", () => {
  beforeEach(() => vi.unstubAllEnvs());

  it("keeps what happens before the library is ready and delivers it in order", async () => {
    const { analyticsStarted, capture, captureException } =
      await loadTrack("phc_test");
    const error = new Error("boom");
    capture("first", { step: 1 });
    captureException(error);
    capture("second");

    const calls: unknown[][] = [];
    analyticsStarted({
      capture: (...args) => calls.push(["capture", ...args]),
      captureException: (...args) => calls.push(["exception", ...args]),
    });

    expect(calls.map((call) => call.slice(0, 2))).toEqual([
      ["capture", "first"],
      ["exception", error],
      ["capture", "second"],
    ]);
    expect(calls[0][2]).toEqual({ step: 1 });
    // The time is the moment it happened, not the moment it was delivered.
    expect(calls[0][3]).toBeInstanceOf(Date);
  });

  it("delivers directly once the library is ready", async () => {
    const { analyticsStarted, capture } = await loadTrack("phc_test");
    const send = vi.fn();
    analyticsStarted({ capture: send, captureException: vi.fn() });
    capture("later", { a: 1 });
    expect(send).toHaveBeenCalledWith("later", { a: 1 }, expect.any(Date));
  });

  it("drops everything on a build without a key", async () => {
    const { analyticsStarted, capture } = await loadTrack("");
    capture("ignored");
    const send = vi.fn();
    analyticsStarted({ capture: send, captureException: vi.fn() });
    expect(send).not.toHaveBeenCalled();
  });
});
