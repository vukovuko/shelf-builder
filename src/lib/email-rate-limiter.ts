import "server-only";

import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

// Track the last email sent time to enforce rate limiting
// Resend has a 2 emails/second limit, so we wait at least 600ms between sends
let lastEmailTime = 0;
const MIN_INTERVAL_MS = 600;

export const FROM_EMAIL = "Ormani po meri <noreply@ormanipomeri.com>";

interface SendEmailParams {
  from?: string;
  to: string;
  subject: string;
  html: string;
}

/**
 * Rate-limited email sender.
 * Ensures at least 600ms between email sends to stay under Resend's 2 req/sec limit.
 */
export async function sendEmail(params: SendEmailParams) {
  const now = Date.now();
  const timeSinceLastEmail = now - lastEmailTime;

  // Wait if we're sending too fast
  if (timeSinceLastEmail < MIN_INTERVAL_MS) {
    const waitTime = MIN_INTERVAL_MS - timeSinceLastEmail;
    await new Promise((resolve) => setTimeout(resolve, waitTime));
  }

  // Update the last email time before sending
  lastEmailTime = Date.now();

  return resend.emails.send({
    from: params.from ?? FROM_EMAIL,
    to: params.to,
    subject: params.subject,
    html: params.html,
  });
}
