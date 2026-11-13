// Components record events through this instead of importing posthog-js.
// The library is about 60 KB gzipped and a direct import puts it in the first
// script of every page. It is loaded after the page is interactive, on the
// production build only (components/Analytics.tsx); what is recorded before
// that waits here, events with the time they happened.

type Properties = Record<string, unknown>;

interface Recorder {
  capture: (
    event: string,
    properties: Properties | undefined,
    at: Date,
  ) => void;
  captureException: (error: unknown) => void;
}

const ENABLED = Boolean(process.env.NEXT_PUBLIC_POSTHOG_KEY);

let recorder: Recorder | null = null;
let waiting: Array<(recorder: Recorder) => void> = [];

function record(call: (recorder: Recorder) => void) {
  if (recorder) call(recorder);
  else if (ENABLED) waiting.push(call);
}

export function capture(event: string, properties?: Properties) {
  const at = new Date();
  record((to) => to.capture(event, properties, at));
}

export function captureException(error: unknown) {
  record((to) => to.captureException(error));
}

/** Called once by the analytics client when the library is ready. */
export function analyticsStarted(ready: Recorder) {
  recorder = ready;
  for (const call of waiting) call(ready);
  waiting = [];
}
