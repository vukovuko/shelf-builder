import { db } from "@/db/db";
import { rules } from "@/db/schema";
import { eq } from "drizzle-orm";
import { notFound } from "next/navigation";
import { RuleFormClient } from "../RuleFormClient";

interface RuleDetailPageProps {
  params: Promise<{ id: string }>;
}

export default async function RuleDetailPage({ params }: RuleDetailPageProps) {
  const { id } = await params;

  const [rule] = await db.select().from(rules).where(eq(rules.id, id));

  if (!rule) {
    notFound();
  }

  const serializedRule = {
    ...rule,
    createdAt: rule.createdAt.toISOString(),
    updatedAt: rule.updatedAt.toISOString(),
  };

  return <RuleFormClient mode="edit" initialRule={serializedRule} />;
}
