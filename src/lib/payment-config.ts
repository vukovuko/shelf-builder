import { db } from "@/db/db";
import { companySettings } from "@/db/schema";
import { eq } from "drizzle-orm";

/** Hardcoded fallback if DB row doesn't exist yet */
const FALLBACK = {
  receiverName: "SLAVISA BLESIC PR STILANO\nZUPANA PRIBILA 14\n11080 BEOGRAD",
  receiverAccount: "265110031009240172",
  paymentCode: "289",
};

export interface PaymentConfig {
  receiverName: string;
  receiverAccount: string;
  paymentCode: string;
}

/**
 * Load company payment config from DB (company_settings row id=1).
 * Falls back to hardcoded values if row doesn't exist or fields are empty.
 * Call this from server-side code only (email sending, API routes).
 */
export async function getPaymentConfig(): Promise<PaymentConfig> {
  try {
    const rows = await db
      .select()
      .from(companySettings)
      .where(eq(companySettings.id, 1))
      .limit(1);

    const row = rows[0];
    if (!row || !row.bankAccount) {
      return FALLBACK;
    }

    // Build receiverName from DB fields: "NAME\nADDRESS\nPOSTAL CITY"
    const nameParts = [row.companyName];
    if (row.companyAddress) nameParts.push(row.companyAddress);
    const cityLine = [row.companyPostalCode, row.companyCity]
      .filter(Boolean)
      .join(" ");
    if (cityLine) nameParts.push(cityLine);

    return {
      receiverName: nameParts.join("\n").slice(0, 70), // IPS max 70 chars
      receiverAccount: row.bankAccount,
      paymentCode: row.paymentCode || FALLBACK.paymentCode,
    };
  } catch (error) {
    console.error(
      "Failed to load payment config from DB, using fallback:",
      error,
    );
    return FALLBACK;
  }
}

/** Format 18-digit account as BBB-AAAAAAAAAAAAA-KK for display */
export function formatAccountNumber(account18: string): string {
  return `${account18.slice(0, 3)}-${account18.slice(3, 16)}-${account18.slice(16)}`;
}
