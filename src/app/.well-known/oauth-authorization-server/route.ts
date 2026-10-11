import { oAuthDiscoveryMetadata } from "better-auth/plugins";
import { auth } from "@/lib/auth";

// OAuth metadata for AI assistants connecting to /api/mcp (RFC 8414).
export const GET = oAuthDiscoveryMetadata(auth);
