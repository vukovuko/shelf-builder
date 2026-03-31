import { eq } from "drizzle-orm";
import { notFound } from "next/navigation";
import { db } from "@/db/db";
import { accessoryRules } from "@/db/schema";
import { serializeRule } from "@/lib/accessory-rules/server";
import { AccessoryRuleFormClient } from "../AccessoryRuleFormClient";

interface AccessoryRuleDetailPageProps {
  params: Promise<{ id: string }>;
}

export default async function AccessoryRuleDetailPage({
  params,
}: AccessoryRuleDetailPageProps) {
  const { id } = await params;
  const [rule] = await db
    .select()
    .from(accessoryRules)
    .where(eq(accessoryRules.id, id));

  if (!rule) {
    notFound();
  }

  return (
    <AccessoryRuleFormClient mode="edit" initialRule={serializeRule(rule)} />
  );
}
