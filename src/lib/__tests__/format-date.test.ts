import { describe, expect, it } from "vitest";
import { formatDate } from "../format-date";

describe("formatDate", () => {
  it("writes month names in Latin script", () => {
    const text = formatDate("2026-11-12T19:24:00Z", {
      day: "numeric",
      month: "long",
      year: "numeric",
    });
    expect(text).toBe("12. novembar 2026.");
  });

  it("uses Belgrade time, whatever the server's zone", () => {
    // 23:30 UTC on the 12th is already the 13th in Belgrade.
    expect(formatDate("2026-11-12T23:30:00Z")).toBe("13. 11. 2026.");
  });
});
