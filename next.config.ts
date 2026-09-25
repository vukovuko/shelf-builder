import { withPostHogConfig } from "@posthog/nextjs-config";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  reactCompiler: true,
  // Required for PostHog API compatibility (prevents trailing slash redirect issues)
  skipTrailingSlashRedirect: true,

  // No remote image sources: every allowed remote URL is one more image
  // anyone can push through our optimizer and bill to the Vercel quota.
  images: {
    remotePatterns: [],
  },

  async rewrites() {
    return {
      // todo.ormanipomeri.com shows the admin to-do board (see
      // src/lib/todo/host.ts) and tells every crawler to stay out.
      beforeFiles: [
        {
          source: "/",
          has: [{ type: "host", value: "todo.ormanipomeri.com" }],
          destination: "/todo-board",
        },
        {
          source: "/robots.txt",
          has: [{ type: "host", value: "todo.ormanipomeri.com" }],
          destination: "/todo-robots.txt",
        },
      ],
      // PostHog reverse proxy — bypasses ad blockers by routing through our domain
      // Path must NOT be /ingest, /analytics, /tracking, /posthog (ad blockers target those)
      afterFiles: [
        {
          source: "/t/static/:path*",
          destination: "https://eu-assets.i.posthog.com/static/:path*",
        },
        {
          source: "/t/:path*",
          destination: "https://eu.i.posthog.com/:path*",
        },
      ],
    };
  },

  async headers() {
    return [
      {
        source: "/:path*",
        has: [{ type: "host", value: "todo.ormanipomeri.com" }],
        headers: [{ key: "X-Robots-Tag", value: "noindex, nofollow" }],
      },
      {
        source: "/:path*",
        headers: [
          {
            key: "X-Content-Type-Options",
            value: "nosniff",
          },
          {
            key: "X-Frame-Options",
            value: "SAMEORIGIN",
          },
          {
            key: "Referrer-Policy",
            value: "strict-origin-when-cross-origin",
          },
          {
            key: "Permissions-Policy",
            value:
              "camera=(), microphone=(), geolocation=(), usb=(), bluetooth=(), accelerometer=(), gyroscope=(), magnetometer=(), payment=(), serial=(), midi=(), web-share=(), fullscreen=(self), picture-in-picture=(self)",
          },
          {
            key: "Content-Security-Policy",
            value: [
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
            ].join("; "),
          },
        ],
      },
    ];
  },
};

export default withPostHogConfig(nextConfig, {
  personalApiKey: process.env.POSTHOG_API_KEY!,
  envId: process.env.POSTHOG_PROJECT_ID!,
  host: process.env.NEXT_PUBLIC_POSTHOG_HOST,
});
