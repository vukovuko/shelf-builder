import "server-only";

import { Resend } from "resend";

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

interface SendEmailParams {
  from?: string;
  to: string;
  subject: string;
  html: string;
}

export async function sendEmail(params: SendEmailParams) {
  return enqueueResend(() =>
    resend.emails.send({
      from: params.from ?? FROM_EMAIL,
      to: params.to,
      subject: params.subject,
      html: params.html,
    }),
  );
}
