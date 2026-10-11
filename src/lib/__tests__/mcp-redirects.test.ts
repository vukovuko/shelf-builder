import { describe, expect, it } from "vitest";
import { isAllowedMcpRedirect } from "@/lib/mcp/redirects";

describe("isAllowedMcpRedirect", () => {
  it.each([
    "https://claude.ai/api/mcp/auth_callback",
    "http://localhost:3118/callback",
    "http://127.0.0.1:51234/callback",
    "http://localhost/callback",
  ])("allows %s", (uri) => {
    expect(isAllowedMcpRedirect(uri)).toBe(true);
  });

  it.each([
    "https://evil.example/callback",
    "https://claude.ai.evil.example/api/mcp/auth_callback",
    "https://claude.ai/api/mcp/auth_callback/../../steal",
    "http://claude.ai/api/mcp/auth_callback",
    "https://localhost:3118/callback",
    "http://localhost:3118/other",
    "http://user:pass@localhost:3118/callback",
    "http://localhost.evil.example/callback",
    "javascript:alert(1)",
    "",
    undefined,
  ])("rejects %s", (uri) => {
    expect(isAllowedMcpRedirect(uri)).toBe(false);
  });
});
