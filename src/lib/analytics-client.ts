import posthog from "posthog-js";
import { authClient } from "./auth-client";
import { onSessionChange } from "./session-events";
import { analyticsStarted } from "./track";

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
    // Started by recordFromFirstInteraction below.
    disable_session_recording: true,
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

  analyticsStarted({
    capture: (event, properties, at) =>
      posthog.capture(event, properties, { timestamp: at }),
    captureException: (error) => posthog.captureException(error),
  });
  recordFromFirstInteraction();

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

const FIRST_INTERACTION = [
  "pointerdown",
  "keydown",
  "touchstart",
  "wheel",
] as const;

/**
 * Session recording copies the page and then the 3D canvas four times a
 * second. While the page loads that competes with building the scene (most
 * of the load time on a slow phone), so it starts with the visitor's first
 * tap, key press or scroll. A visit without any of those is not recorded.
 */
function recordFromFirstInteraction() {
  const options = { capture: true, passive: true } as const;
  const start = () => {
    for (const name of FIRST_INTERACTION) {
      window.removeEventListener(name, start, options);
    }
    // After the interaction itself has been handled, not in the middle of it.
    const whenIdle = window.requestIdleCallback ?? window.setTimeout;
    whenIdle(() => posthog.startSessionRecording());
  };
  for (const name of FIRST_INTERACTION) {
    window.addEventListener(name, start, options);
  }
}
