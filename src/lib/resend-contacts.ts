import "server-only";

import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);
const NEWSLETTER_SEGMENT_ID = process.env.RESEND_NEWSLETTER_SEGMENT_ID!;
const CUSTOMERS_SEGMENT_ID = process.env.RESEND_CUSTOMERS_SEGMENT_ID!;

/**
 * Sync a user's newsletter preference to Resend Contacts + Segments.
 * Fire-and-forget — never throws, never blocks the caller.
 *
 * Subscribe: creates contact (idempotent) then adds to Newsletter segment.
 * Unsubscribe: removes contact from Newsletter segment (contact stays in system).
 */
export async function syncResendContact(
  email: string,
  firstName: string,
  subscribed: boolean,
) {
  try {
    if (subscribed) {
      await resend.contacts.create({ email, firstName, unsubscribed: false });
      await resend.contacts.segments.add({
        email,
        segmentId: NEWSLETTER_SEGMENT_ID,
      });
    } else {
      await resend.contacts.segments.remove({
        email,
        segmentId: NEWSLETTER_SEGMENT_ID,
      });
    }
  } catch {
    console.error(`[Resend] Failed to sync contact ${email}`);
  }
}

/**
 * Add a customer to the Customers segment after a successful order.
 * Fire-and-forget — never throws, never blocks checkout.
 */
export async function addToCustomersSegment(email: string, firstName: string) {
  try {
    await resend.contacts.create({ email, firstName, unsubscribed: false });
    await resend.contacts.segments.add({
      email,
      segmentId: CUSTOMERS_SEGMENT_ID,
    });
  } catch {
    console.error(`[Resend] Failed to add customer ${email}`);
  }
}
