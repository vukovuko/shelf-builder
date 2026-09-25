import { describe, expect, it } from "vitest";
import { rateLimitKey } from "../rate-limit-key";

describe("rateLimitKey", () => {
  it("keeps IPv4 addresses and account ids as they are", () => {
    expect(rateLimitKey("203.0.113.7")).toBe("203.0.113.7");
    expect(rateLimitKey("anonymous")).toBe("anonymous");
    expect(rateLimitKey("VRUBjFf17uY0BWghr7eJSY9VyOaBM39H")).toBe(
      "VRUBjFf17uY0BWghr7eJSY9VyOaBM39H",
    );
  });

  it("puts every address in one IPv6 /64 under the same key", () => {
    const key = rateLimitKey("2001:db8:1:2::1");
    expect(key).toBe("2001:0db8:0001:0002::/64");
    expect(rateLimitKey("2001:db8:1:2:ffff:ffff:ffff:ffff")).toBe(key);
    expect(rateLimitKey("2001:DB8:1:2:A:B:C:D")).toBe(key);
  });

  it("keeps different /64s apart", () => {
    expect(rateLimitKey("2001:db8:1:3::1")).not.toBe(
      rateLimitKey("2001:db8:1:2::1"),
    );
  });

  it("expands compressed addresses", () => {
    expect(rateLimitKey("2001:db8::1")).toBe("2001:0db8:0000:0000::/64");
    expect(rateLimitKey("::1")).toBe("0000:0000:0000:0000::/64");
  });

  it("treats IPv4-mapped IPv6 as the IPv4 address", () => {
    expect(rateLimitKey("::ffff:192.0.2.1")).toBe("192.0.2.1");
  });
});
