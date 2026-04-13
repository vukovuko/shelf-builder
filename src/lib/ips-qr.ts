import "server-only";

import QRCode from "qrcode";

export interface IpsPaymentData {
  receiverName: string; // N — max 70 chars, max 3 lines
  receiverAccount: string; // R — 18 digits, no dashes
  amount: number; // I — RSD amount
  paymentCode: string; // SF — 3 digits (e.g. "289")
  paymentPurpose: string; // S — max 35 chars
  referenceNumber?: string; // RO — poziv na broj with model prefix (e.g. "001001")
}

/**
 * Build the NBS IPS pipe-delimited string.
 * Format: K:PR|V:01|C:1|R:...|N:...|I:RSD...|SF:...|S:...|RO:...
 *
 * @see https://ips.nbs.rs/en/qr-validacija-generisanje
 */
export function buildIpsString(data: IpsPaymentData): string {
  // Format amount: RSD{integer},{decimal} — comma as decimal separator, no thousands
  const amt = data.amount.toFixed(2).replace(".", ",");

  // Sanitize pipe chars from values (spec requires replacing | with -)
  const sanitize = (s: string) => s.replace(/\|/g, "-");

  const parts = [
    `K:PR`,
    `V:01`,
    `C:1`,
    `R:${data.receiverAccount}`,
    `N:${sanitize(data.receiverName)}`,
    `I:RSD${amt}`,
    `SF:${data.paymentCode}`,
    `S:${sanitize(data.paymentPurpose)}`,
  ];

  if (data.referenceNumber) {
    parts.push(`RO:${sanitize(data.referenceNumber)}`);
  }

  return parts.join("|");
}

/**
 * Generate an IPS QR code as a PNG Buffer.
 * Use with Resend CID attachments to embed in emails.
 */
export async function generateIpsQrBuffer(
  data: IpsPaymentData,
): Promise<Buffer> {
  const ipsString = buildIpsString(data);
  return QRCode.toBuffer(ipsString, {
    errorCorrectionLevel: "M",
    margin: 2,
    width: 200,
    type: "png",
  });
}
