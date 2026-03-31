import { eq } from "drizzle-orm";
import { notFound } from "next/navigation";
import { db } from "@/db/db";
import { accessoryRules } from "@/db/schema";
import { AccessoryRuleFormClient } from "../AccessoryRuleFormClient";

interface AccessoryRuleDetailPageProps {
  params: Promise<{ id: string }>;
}

export default async function AccessoryRuleDetailPage({
  params,
}: AccessoryRuleDetailPageProps) {
  const { id } = await params;
  const [rule] = await db.select().from(accessoryRules).where(eq(accessoryRules.id, id));

  if (!rule) {
    notFound();
  }

  return (
    <AccessoryRuleFormClient
      mode="edit"
      initialRule={{
        ...rule,
        createdAt: rule.createdAt.toISOString(),
        updatedAt: rule.updatedAt.toISOString(),
      }}
    />
  );
}