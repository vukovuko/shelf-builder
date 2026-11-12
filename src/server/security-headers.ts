// The same policy the Next.js site sends (next.config.ts on `main`).
const CONTENT_SECURITY_POLICY = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://challenges.cloudflare.com https://eu-assets.i.posthog.com",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob: https:",
  "font-src 'self' data:",
  "connect-src 'self' https://challenges.cloudflare.com https://*.r2.cloudflarestorage.com https://maps.googleapis.com https://eu.i.posthog.com https://eu-assets.i.posthog.com",
  "frame-src 'self' https://challenges.cloudflare.com",
  "worker-src 'self' blob:",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'self'",
].join("; ");

// Files in public/ are served without the Worker, so public/_headers repeats
// these for them; a test keeps the two in step.
export const SECURITY_HEADERS: [name: string, value: string][] = [
  ["X-Content-Type-Options", "nosniff"],
  ["X-Frame-Options", "SAMEORIGIN"],
  ["Referrer-Policy", "strict-origin-when-cross-origin"],
  [
    "Permissions-Policy",
    "camera=(), microphone=(), geolocation=(), usb=(), bluetooth=(), accelerometer=(), gyroscope=(), magnetometer=(), payment=(), serial=(), midi=(), web-share=(), fullscreen=(self), picture-in-picture=(self)",
  ],
  ["Content-Security-Policy", CONTENT_SECURITY_POLICY],
];

export function withSecurityHeaders(response: Response): Response {
  try {
    for (const [name, value] of SECURITY_HEADERS) {
      response.headers.set(name, value);
    }
    return response;
  } catch {
    // A response passed on from fetch() has read-only headers.
    const copy = new Response(response.body, response);
    for (const [name, value] of SECURITY_HEADERS) {
      copy.headers.set(name, value);
    }
    return copy;
  }
}
