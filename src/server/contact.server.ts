import { and, eq } from "drizzle-orm";
import { db } from "@/db/db";
import { contactMessages, user } from "@/db/schema";
import { sendEmail } from "@/lib/email-rate-limiter";
import { verifyTurnstile } from "@/lib/turnstile";
import {
  checkRateLimit,
  contactRateLimit,
  getIdentifier,
} from "@/lib/upstash-rate-limit";
import { escapeHtml } from "@/lib/utils";

export interface PublicContactInput {
  name: string;
  email?: string | null;
  phone?: string | null;
  message: string;
  turnstileToken: string;
}

/** What the form shows: sent, or the reason it was not. */
export type ContactResult = { ok: true } | { ok: false; error: string };

/** A message from the public contact form: saved, then mailed to the admins. */
export async function submitPublicContact(
  input: PublicContactInput,
  request: Request,
): Promise<ContactResult> {
  const identifier = getIdentifier(request);
  const limited = await checkRateLimit(contactRateLimit, identifier);
  if (limited) {
    const { error } = (await limited.json()) as { error: string };
    return { ok: false, error };
  }

  const { name, email, phone, message, turnstileToken } = input;
  if (!(await verifyTurnstile(turnstileToken, identifier))) {
    return { ok: false, error: "Verifikacija nije uspela. Pokušajte ponovo." };
  }
  if (!email && !phone) {
    return { ok: false, error: "Unesite email ili broj telefona" };
  }

  // No userId: the public form does not know who is signed in.
  await db.insert(contactMessages).values({
    userId: null,
    name,
    email: email || null,
    phone: phone || null,
    wardrobeId: null,
    message,
    status: "new",
  });

  const admins = await db
    .select({ email: user.email })
    .from(user)
    .where(and(eq(user.role, "admin"), eq(user.receiveOrderEmails, true)));

  // Escaped: this text goes into an email's HTML.
  const safeName = escapeHtml(name);
  const safeEmail = email ? escapeHtml(email) : null;
  const safePhone = phone ? escapeHtml(phone) : null;
  const safeMessage = escapeHtml(message).replace(/\n/g, "<br />");

  for (const admin of admins) {
    await sendEmail({
      to: admin.email,
      // Replying answers the customer directly.
      ...(email && { replyTo: email }),
      subject: `Nova kontakt poruka (javna) - ${safeName}`,
      html: `
          <h2>Nova kontakt poruka (javna forma)</h2>
          <p><strong>Od:</strong> ${safeName}</p>
          ${safeEmail ? `<p><strong>Email:</strong> ${safeEmail}</p>` : ""}
          ${safePhone ? `<p><strong>Telefon:</strong> ${safePhone}</p>` : ""}
          <hr />
          <p><strong>Poruka:</strong></p>
          <p>${safeMessage}</p>
        `,
    });
  }

  return { ok: true };
}
