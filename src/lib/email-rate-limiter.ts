import "server-only";

import { Resend } from "resend";
import { getPostHogServer } from "./posthog-server";

export const resend = new Resend(process.env.RESEND_API_KEY);

export const FROM_EMAIL = "Ormani po meri <noreply@ormanipomeri.com>";

// Serial queue for all Resend calls from this instance, spaced to stay under
// Resend's 10 requests/second per team. Other instances can still collide,
// which sendEmail absorbs by retrying rate-limit errors.
let lastCallTime = 0;
let pending: Promise<void> = Promise.resolve();
const MIN_GAP_MS = 150;

export function enqueueResend<T>(fn: () => Promise<T>): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    pending = pending.then(async () => {
      const elapsed = Date.now() - lastCallTime;
      if (elapsed < MIN_GAP_MS) {
        await new Promise((r) => setTimeout(r, MIN_GAP_MS - elapsed));
      }
      lastCallTime = Date.now();
      try {
        resolve(await fn());
      } catch (e) {
        reject(e);
      }
    });
  });
}

interface EmailAttachment {
  filename: string;
  content: Buffer;
  contentId?: string;
  contentType?: string;
}

interface SendEmailParams {
  from?: string;
  to: string;
  subject: string;
  html: string;
  attachments?: EmailAttachment[];
  /**
   * Resend sends at most once per key within 24 hours, so retries (ours or
   * a repeated request) never duplicate the email. Format: "<kind>/<id>".
   */
  idempotencyKey?: string;
}

// Resend and network failures (statusCode null) that may pass on a retry.
// Quota and validation errors would fail the same way again.
const TRANSIENT = new Set([
  "concurrent_idempotent_requests",
  "application_error",
  "internal_server_error",
]);
const RETRY_DELAYS_MS = [1000, 3000];

/**
 * A rate-limited request was never processed, so it can always be retried.
 * After a network or server error Resend may already have sent the email,
 * and only an idempotency key makes that retry safe.
 */
function shouldRetry(
  error: { name: string; statusCode: number | null } | null,
  params: SendEmailParams,
) {
  if (error?.name === "rate_limit_exceeded") return true;
  if (!params.idempotencyKey) return false;
  return (
    error === null ||
    TRANSIENT.has(error.name) ||
    error.statusCode === null ||
    error.statusCode >= 500
  );
}

/**
 * Sends one email and returns whether Resend accepted it. Never throws:
 * callers send several in a row (order, admin, invoice) and one failure
 * must not stop the rest. Resend reports rejections (bad address, sending
 * limits) in its result instead of throwing, so both paths are checked.
 */
export async function sendEmail(params: SendEmailParams): Promise<boolean> {
  let reason = "";
  for (let attempt = 0; attempt <= RETRY_DELAYS_MS.length; attempt++) {
    if (attempt > 0) {
      await new Promise((r) => setTimeout(r, RETRY_DELAYS_MS[attempt - 1]));
    }
    try {
      const { error } = await enqueueResend(() =>
        resend.emails.send(
          {
            from: params.from ?? FROM_EMAIL,
            to: params.to,
            subject: params.subject,
            html: params.html,
            attachments: params.attachments,
          },
          params.idempotencyKey
            ? { idempotencyKey: params.idempotencyKey }
            : undefined,
        ),
      );
      if (!error) return true;
      reason = `${error.name}: ${error.message}`;
      if (!shouldRetry(error, params)) break;
    } catch (error) {
      reason = String(error);
      if (!shouldRetry(null, params)) break;
    }
  }
  reportEmailFailure(params, reason);
  return false;
}

function reportEmailFailure(params: SendEmailParams, reason: string) {
  console.error(
    `Email to ${params.to} failed ("${params.subject}"): ${reason}`,
  );
  getPostHogServer()?.capture({
    distinctId: "email",
    event: "email_failed",
    properties: {
      to: params.to,
      subject: params.subject,
      reason,
      $process_person_profile: false,
    },
  });
}
