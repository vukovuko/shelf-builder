import { asc, eq } from "drizzle-orm";
import { db } from "@/db/db";
import { accessoryRules } from "@/db/schema";
import type { SerializedAccessoryRule } from "./types";

export async function getEnabledAccessoryRules(): Promise<SerializedAccessoryRule[]> {
  const rows = await db
    .select()
    .from(accessoryRules)
    .where(eq(accessoryRules.enabled, true))
    .orderBy(asc(accessoryRules.priority), asc(accessoryRules.createdAt));

  return rows.map((rule) => ({
    ...rule,
    createdAt: rule.createdAt.toISOString(),
    updatedAt: rule.updatedAt.toISOString(),
  }));
}
