import "server-only";
import { env } from "cloudflare:workers";

/**
 * Uploads to the public R2 bucket and returns the object's public URL.
 *
 * Through the Worker's own bucket binding (`UPLOADS` in wrangler.jsonc), not
 * the AWS SDK: its S3 client does not survive the Workers build (it fails
 * with "emitWarningIfUnsupportedVersion is not a function"), and a binding
 * needs no access keys.
 */
export async function putR2Object(
  key: string,
  body: Uint8Array | ArrayBuffer,
  contentType: string,
): Promise<string> {
  const baseUrl = process.env.R2_BASE_URL;
  if (!baseUrl) throw new Error("R2 is not configured");
  await env.UPLOADS.put(key, body, { httpMetadata: { contentType } });
  return `${baseUrl}/${key}`;
}
