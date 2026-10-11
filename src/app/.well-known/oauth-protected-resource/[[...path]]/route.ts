import {
  getPublicOrigin,
  metadataCorsOptionsRequestHandler,
  protectedResourceHandler,
} from "mcp-handler";

/**
 * RFC 9728 metadata for /api/mcp: which server issues its tokens. Claude
 * reads it at /.well-known/oauth-protected-resource/api/mcp and wants
 * `resource` to equal the MCP URL exactly.
 */
export function GET(req: Request) {
  const origin = getPublicOrigin(req);
  return protectedResourceHandler({
    authServerUrls: [process.env.BETTER_AUTH_URL ?? origin],
    resourceUrl: `${origin}/api/mcp`,
  })(req);
}

export const OPTIONS = metadataCorsOptionsRequestHandler();
