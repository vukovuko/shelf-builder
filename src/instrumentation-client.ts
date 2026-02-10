import posthog from "posthog-js";

posthog.init(process.env.NEXT_PUBLIC_POSTHOG_KEY!, {
  api_host: process.env.NEXT_PUBLIC_POSTHOG_HOST,
  defaults: "2025-11-30",
  before_send: (event) => {
    if (window.location.pathname.startsWith("/admin")) return null;
    return event;
  },
});
