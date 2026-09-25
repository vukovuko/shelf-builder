import "server-only";

import { Resend } from "resend";
import { getPostHogServer } from "./posthog-server";

export const resend = new Resend(process.env.RESEND_API_KEY);

export const FROM_EMAIL = "Ormani po meri <noreply@ormanipomeri.com>";

// Serial promise-chain queue for ALL Resend API calls.
// Guarantees at least 600ms between calls (Resend limit: 2 req/s).
// Concurrent callers are serialized automatically — no race conditions.
let lastCallTime = 0;
let pending: Promise<void> = Promise.resolve();
const MIN_GAP_MS = 600;

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
}

/**
 * Sends one email and returns whether Resend accepted it. Never throws:
 * callers send several in a row (order, admin, invoice) and one failure
 * must not stop the rest. Resend reports rejections (bad address, sending
 * limits) in its result instead of throwing, so both paths are checked.
 */
export async function sendEmail(params: SendEmailParams): Promise<boolean> {
  try {
    const { error } = await enqueueResend(() =>
      resend.emails.send({
        from: params.from ?? FROM_EMAIL,
        to: params.to,
        subject: params.subject,
        html: params.html,
        attachments: params.attachments,
      }),
    );
    if (!error) return true;
    reportEmailFailure(params, `${error.name}: ${error.message}`);
  } catch (error) {
    reportEmailFailure(params, String(error));
  }
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
