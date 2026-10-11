import { timingSafeEqual } from "node:crypto";
import type { AuthInfo } from "@modelcontextprotocol/server";
import { eq } from "drizzle-orm";
import { createMcpHandler, withMcpAuth } from "mcp-handler";
import { db } from "@/db/db";
import { user } from "@/db/schema";
import { auth } from "@/lib/auth";
import { registerAdminTools } from "@/lib/mcp/tools";

// Read-only admin data for AI assistants (Claude, Claude Code, LangChain…).
// Only admins get in: through OAuth with their own account, or with the
// MCP_API_KEY secret for scripts.
export const maxDuration = 60;

const handler = createMcpHandler(registerAdminTools, {
  serverInfo: { name: "ormanipomeri-admin", version: "1.0.0" },
});

/** For scripts and LangChain; unset or short means no key works. */
function matchesApiKey(token: string): boolean {
  const key = process.env.MCP_API_KEY;
  if (!key || key.length < 32) return false;
  const given = Buffer.from(token);
  const expected = Buffer.from(key);
  return given.length === expected.length && timingSafeEqual(given, expected);
}

async function verifyToken(
  req: Request,
  bearerToken?: string,
): Promise<AuthInfo | undefined> {
  if (!bearerToken) return undefined;
  if (matchesApiKey(bearerToken)) {
    return { token: bearerToken, clientId: "api-key", scopes: [] };
  }
  const session = await auth.api.getMcpSession({ headers: req.headers });
  if (!session?.userId) return undefined;
  const [account] = await db
    .select({ role: user.role, banned: user.banned })
    .from(user)
    .where(eq(user.id, session.userId))
    .limit(1);
  // Any customer can complete the OAuth sign-in; only admins get the data.
  if (account?.role !== "admin" || account.banned) return undefined;
  return {
    token: bearerToken,
    clientId: session.clientId,
    scopes: session.scopes.split(" "),
    extra: { userId: session.userId },
  };
}

const authed = withMcpAuth(
  async (req) => {
    const call = await req
      .clone()
      .json()
      .catch(() => null);
    if (call?.method === "tools/call") {
      const who = req.auth?.extra?.userId ?? req.auth?.clientId;
      console.log(`mcp: ${call.params?.name} by ${who}`);
    }
    return handler(req);
  },
  verifyToken,
  {
    required: true,
    resourceMetadataPath: "/.well-known/oauth-protected-resource/api/mcp",
  },
);

export { authed as DELETE, authed as GET, authed as POST };
