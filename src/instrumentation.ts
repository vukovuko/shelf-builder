export function register() {
  // No-op — required export
}

export const onRequestError = async (
  err: Error,
  request: { headers: { cookie?: string | string[] } },
  _context: unknown,
) => {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const { getPostHogServer } = await import("./lib/posthog-server");
    const posthog = getPostHogServer();

    let distinctId: string | undefined;
    if (request.headers.cookie) {
      const cookieString = Array.isArray(request.headers.cookie)
        ? request.headers.cookie.join("; ")
        : request.headers.cookie;

      const match = cookieString.match(/ph_phc_.*?_posthog=([^;]+)/);
      if (match?.[1]) {
        try {
          const data = JSON.parse(decodeURIComponent(match[1]));
          distinctId = data.distinct_id;
        } catch {
          // Ignore malformed PostHog cookie
        }
      }
    }

    await posthog.captureException(err, distinctId);
  }
};
