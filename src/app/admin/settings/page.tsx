import { db } from "@/db/db";
import { companySettings } from "@/db/schema";
import { eq } from "drizzle-orm";
import { SettingsClient } from "./SettingsClient";

export default async function SettingsPage() {
  const rows = await db
    .select()
    .from(companySettings)
    .where(eq(companySettings.id, 1))
    .limit(1);

  const settings = rows[0] ?? {
    companyName: "",
    companyAddress: "",
    companyCity: "",
    companyPostalCode: "",
    pib: "",
    mb: "",
    bankAccount: "",
    paymentCode: "289",
    contactPhone: "",
    contactEmail: "",
  };

  return <SettingsClient initialSettings={settings} />;
}
