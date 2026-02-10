import type { NextConfig } from "next";
import { withPostHogConfig } from "@posthog/nextjs-config";

const nextConfig: NextConfig = {
  /* config options here */
  reactCompiler: true,

  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "cdn.shadcnstudio.com",
        pathname: "/ss-assets/**",
      },
    ],
  },

  async headers() {
    return [
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
              "connect-src 'self' https://challenges.cloudflare.com https://*.r2.cloudflarestorage.com https://maps.googleapis.com https://raw.githack.com https://raw.githubusercontent.com https://eu.i.posthog.com https://eu-assets.i.posthog.com",
              "frame-src 'self' https://challenges.cloudflare.com",
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
