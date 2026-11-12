import posthog from "posthog-js";
import { authClient } from "./auth-client";
import { onSessionChange } from "./session-events";

/**
 * Starts PostHog in the browser. Loaded only by the production build (see
 * `Analytics`), so test builds never write into the real statistics.
 * Events go through /t on our own domain (src/routes/t/$.ts).
 */
export function startAnalytics(key: string) {
  posthog.init(key, {
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

  // Ties the visit to the account, and unties it on sign-out.
  let identifiedAs: string | null = null;
  async function identify() {
    const { data } = await authClient.getSession();
    const account = data?.user ?? null;
    if ((account?.id ?? null) === identifiedAs) return;
    identifiedAs = account?.id ?? null;
    if (account) {
      posthog.identify(account.id, {
        email: account.email,
        name: account.name,
      });
    } else if (posthog._isIdentified()) {
      posthog.reset();
    }
  }
  void identify();
  onSessionChange(() => void identify());
}
