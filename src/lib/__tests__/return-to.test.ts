import { describe, expect, it } from "vitest";
import { safeReturnTo, signInUrl } from "../return-to";

describe("safeReturnTo", () => {
  it("keeps paths on this site, with their query", () => {
    expect(safeReturnTo("/admin/orders/abc")).toBe("/admin/orders/abc");
    expect(safeReturnTo("/admin/orders?status=open")).toBe(
      "/admin/orders?status=open",
    );
  });

  it.each([
    undefined,
    null,
    "",
    "admin",
    "https://evil.example",
    "//evil.example",
    "/\\evil.example",
    "/\t/evil.example",
    "/\n/evil.example",
    "javascript:alert(1)",
    "/prijava",
    "/prijava?return_to=/admin",
    "/api/auth/sign-out",
  ])("sends %j home instead", (value) => {
    expect(safeReturnTo(value)).toBe("/");
  });
});

describe("signInUrl", () => {
  it("carries the page to come back to", () => {
    expect(signInUrl("/admin/orders/abc")).toBe(
      "/prijava?return_to=%2Fadmin%2Forders%2Fabc",
    );
  });

  it("drops an unsafe target", () => {
    expect(signInUrl("//evil.example")).toBe("/prijava");
  });
});
