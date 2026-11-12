import { useEffect } from "react";

// Empty unless the build is the production one (vite.config.ts), and then
// the whole branch below is dropped from the bundle.
const POSTHOG_KEY = process.env.NEXT_PUBLIC_POSTHOG_KEY;

/** Starts visitor statistics after the page is interactive. */
export function Analytics() {
  useEffect(() => {
    if (!POSTHOG_KEY) return;
    import("@/lib/analytics-client").then(({ startAnalytics }) =>
      startAnalytics(POSTHOG_KEY),
    );
  }, []);
  return null;
}
