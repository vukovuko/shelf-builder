import { NextResponse } from "next/server";
import { db } from "@/db/db";
import { rules } from "@/db/schema";
import { asc } from "drizzle-orm";
import { requireAdmin } from "@/lib/roles";
import { z } from "zod";

// Validation schemas
const conditionSchema = z.object({
  id: z.string(),
  field: z.string().min(1, "Polje je obavezno"),
  operator: z.string().min(1, "Operator je obavezan"),
  value: z.union([
    z.string(),
    z.number(),
    z.boolean(),
    z.array(z.string()),
    z.array(z.number()),
    z.null(),
  ]),
  logicOperator: z.enum(["AND", "OR"]).optional(),
});

const actionConfigSchema = z.object({
  itemName: z.string().nullish(),
  itemSku: z.string().nullish(),
  itemPrice: z.number().nullish(),
  quantity: z.union([z.number(), z.string()]).nullish(),
  visibleToCustomer: z.boolean().nullish(),
  value: z.number().nullish(),
  applyTo: z.string().nullish(),
  reason: z.string().nullish(),
});

const actionSchema = z.object({
  id: z.string(),
  type: z.enum([
    "add_item",
    "discount_percentage",
    "discount_fixed",
    "surcharge_percentage",
    "surcharge_fixed",
  ]),
  config: actionConfigSchema,
});

const createRuleSchema = z.object({
  name: z.string().min(1, "Naziv je obavezan"),
  description: z.string().nullish(),
  enabled: z.boolean().optional(),
  priority: z.number().int().optional(),
  conditions: z.array(conditionSchema).min(0),
  actions: z.array(actionSchema).min(1, "Najmanje jedna akcija je obavezna"),
});

// Helper to strip null values from action configs (database expects undefined, not null)
function sanitizeActions(
  actions: z.infer<typeof actionSchema>[],
): { id: string; type: string; config: Record<string, unknown> }[] {
  return actions.map((action) => ({
    id: action.id,
    type: action.type,
    config: Object.fromEntries(
      Object.entries(action.config).map(([key, value]) => [
        key,
        value === null ? undefined : value,
      ]),
    ),
  }));
}

// Helper to strip null values from condition values (for is_empty/is_not_empty operators)
function sanitizeConditions(conditions: z.infer<typeof conditionSchema>[]) {
  return conditions.map((cond) => ({
    ...cond,
    // Convert null value to empty string (is_empty/is_not_empty don't use value anyway)
    value: cond.value === null ? "" : cond.value,
  }));
}

export async function GET() {
  try {
    await requireAdmin();

    const allRules = await db
      .select()
      .from(rules)
      .orderBy(asc(rules.priority), asc(rules.createdAt));

    return NextResponse.json(allRules);
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === "UNAUTHORIZED") {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }
      if (error.message === "FORBIDDEN") {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
    }
    console.error("Failed to fetch rules:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  try {
    await requireAdmin();

    const body = await request.json();
    const validation = createRuleSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: validation.error.issues[0].message },
        { status: 400 },
      );
    }

    const { name, description, enabled, priority, conditions, actions } =
      validation.data;

    const [created] = await db
      .insert(rules)
      .values({
        name,
        description: description ?? undefined,
        enabled: enabled ?? true,
        priority: priority ?? 100,
        conditions: sanitizeConditions(conditions),
        actions: sanitizeActions(actions),
      })
      .returning();

    return NextResponse.json(created, { status: 201 });
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === "UNAUTHORIZED") {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }
      if (error.message === "FORBIDDEN") {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
    }
    console.error("Failed to create rule:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
