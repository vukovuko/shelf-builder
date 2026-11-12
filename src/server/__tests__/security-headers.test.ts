import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { SECURITY_HEADERS, withSecurityHeaders } from "../security-headers";

describe("security headers", () => {
  it("are the same for static files (public/_headers) as for pages", () => {
    const staticFileHeaders = readFileSync("public/_headers", "utf8");
    for (const [name, value] of SECURITY_HEADERS) {
      expect(staticFileHeaders).toContain(`  ${name}: ${value}\n`);
    }
  });

  it("are added to a response whose headers cannot be changed", () => {
    const fetched = Response.redirect("https://example.com/", 302);
    const response = withSecurityHeaders(fetched);
    expect(response.headers.get("X-Frame-Options")).toBe("SAMEORIGIN");
    expect(response.status).toBe(302);
    expect(response.headers.get("Location")).toBe("https://example.com/");
  });
});
