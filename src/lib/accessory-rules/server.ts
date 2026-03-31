import { asc, eq } from "drizzle-orm";
import { db } from "@/db/db";
import { accessoryRules } from "@/db/schema";
import type { AccessoryRuleTarget, SerializedAccessoryRule } from "./types";
import type { Operator, RuleCondition } from "@/lib/rules/types";

/** Cast a DB accessory-rule row to SerializedAccessoryRule.
 *  DB stores `operator` and `target` as plain strings; this narrows them. */
export function serializeRule(rule: {
  id: string;
  name: string;
  description: string | null;
  enabled: boolean;
  priority: number;
  target: string;
  conditions: Array<{
    id: string;
    field: string;
    operator: string;
    value: string | number | boolean | string[] | number[];
    logicOperator?: "AND" | "OR";
  }>;
  config: {
    itemName: string;
    codePrefix?: string;
    materialType?: "korpus" | "front" | "back";
    widthFormula: string;
    heightFormula: string;
    thicknessFormula?: string;
    quantity?: number | string;
  };
  createdAt: Date;
  updatedAt: Date;
}): SerializedAccessoryRule {
  return {
    ...rule,
    description: rule.description ?? null,
    target: rule.target as AccessoryRuleTarget,
    conditions: rule.conditions.map((c) => ({
      ...c,
      operator: c.operator as Operator,
    })) as RuleCondition[],
    createdAt: rule.createdAt.toISOString(),
    updatedAt: rule.updatedAt.toISOString(),
  };
}

export async function getEnabledAccessoryRules(): Promise<
  SerializedAccessoryRule[]
> {
  const rows = await db
    .select()
    .from(accessoryRules)
    .where(eq(accessoryRules.enabled, true))
    .orderBy(asc(accessoryRules.priority), asc(accessoryRules.createdAt));

  return rows.map(serializeRule);
}
