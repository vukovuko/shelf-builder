import { PostHog } from "posthog-node";

let posthogInstance: PostHog | null = null;

export function getPostHogServer(): PostHog | null {
  const isDev = process.env.NODE_ENV === "development";
  const debugFlag = process.env.NEXT_PUBLIC_POSTHOG_DEBUG === "true";
  if (isDev && !debugFlag) return null;

  if (!posthogInstance) {
    posthogInstance = new PostHog(process.env.NEXT_PUBLIC_POSTHOG_KEY!, {
      host: process.env.NEXT_PUBLIC_POSTHOG_HOST,
      flushAt: 1,
      flushInterval: 0,
    });
  }
  return posthogInstance;
}
