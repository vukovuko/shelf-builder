import posthog from "posthog-js";

const isDev = process.env.NODE_ENV === "development";
const debugFlag = process.env.NEXT_PUBLIC_POSTHOG_DEBUG === "true";

if (!isDev || debugFlag) {
  posthog.init(process.env.NEXT_PUBLIC_POSTHOG_KEY!, {
    api_host: "/t",
    ui_host: "https://eu.posthog.com",
    defaults: "2026-01-30",
    session_recording: {
      captureCanvas: {
        canvasFps: 4,
        canvasQuality: "0.4",
      },
    },
    before_send: (event) => {
      if (window.location.pathname.startsWith("/admin")) return null;
      return event;
    },
  });
}
