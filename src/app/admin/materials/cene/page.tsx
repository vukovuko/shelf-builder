import { eq } from "drizzle-orm";
import { db } from "@/db/db";
import { companySettings } from "@/db/schema";
import { requireAdminPage } from "@/lib/roles";
import { PriceSyncClient } from "./PriceSyncClient";

export default async function MaterialPricesPage() {
  await requireAdminPage();
  const [settings] = await db
    .select({
      marginPercent: companySettings.materialMarginPercent,
      syncedAt: companySettings.materialPricesSyncedAt,
    })
    .from(companySettings)
    .where(eq(companySettings.id, 1))
    .limit(1);

  return (
    <PriceSyncClient
      initialMargin={settings?.marginPercent ?? 0}
      syncedAt={settings?.syncedAt?.toISOString() ?? null}
    />
  );
}
