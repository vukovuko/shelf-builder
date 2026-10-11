/**
 * Where an AI assistant may receive the OAuth code for /api/mcp, per
 * Anthropic's connector docs (claude.com/docs/connectors/building/
 * authentication): the hosted Claude apps (web, Desktop, mobile) use one fixed
 * callback, Claude Code a loopback callback on any port.
 *
 * The mcp plugin lets any app register itself and asks for no consent, so
 * without this list an attacker could register an app pointing at their own
 * server and get an admin's token from a link the admin clicks.
 */
const HOSTED_CALLBACKS = new Set(["https://claude.ai/api/mcp/auth_callback"]);

export function isAllowedMcpRedirect(uri: unknown): boolean {
  if (typeof uri !== "string") return false;
  if (HOSTED_CALLBACKS.has(uri)) return true;
  let url: URL;
  try {
    url = new URL(uri);
  } catch {
    return false;
  }
  return (
    url.protocol === "http:" &&
    (url.hostname === "localhost" || url.hostname === "127.0.0.1") &&
    url.pathname === "/callback" &&
    !url.username &&
    !url.password
  );
}
