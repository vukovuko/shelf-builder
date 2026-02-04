import { NextResponse } from "next/server";
import { db } from "@/db/db";
import { rules } from "@/db/schema";
import { eq } from "drizzle-orm";
import { requireAdmin } from "@/lib/roles";
import { z } from "zod";

const ruleIdSchema = z.string().uuid("Neispravan ID pravila");

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

const updateRuleSchema = z.object({
  name: z.string().min(1).optional(),
  description: z.string().nullish(),
  enabled: z.boolean().optional(),
  priority: z.number().int().optional(),
  conditions: z.array(conditionSchema).optional(),
  actions: z.array(actionSchema).optional(),
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

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    await requireAdmin();

    const { id } = await params;
    const validatedId = ruleIdSchema.safeParse(id);

    if (!validatedId.success) {
      return NextResponse.json(
        { error: validatedId.error.issues[0].message },
        { status: 400 },
      );
    }

    const [rule] = await db
      .select()
      .from(rules)
      .where(eq(rules.id, validatedId.data));

    if (!rule) {
      return NextResponse.json(
        { error: "Pravilo nije pronađeno" },
        { status: 404 },
      );
    }

    return NextResponse.json(rule);
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === "UNAUTHORIZED") {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }
      if (error.message === "FORBIDDEN") {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
    }
    console.error("Failed to fetch rule:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    await requireAdmin();

    const { id } = await params;
    const validatedId = ruleIdSchema.safeParse(id);

    if (!validatedId.success) {
      return NextResponse.json(
        { error: validatedId.error.issues[0].message },
        { status: 400 },
      );
    }

    const body = await request.json();
    const validation = updateRuleSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: validation.error.issues[0].message },
        { status: 400 },
      );
    }

    const { description, actions, conditions, ...restUpdates } =
      validation.data;

    const [updated] = await db
      .update(rules)
      .set({
        ...restUpdates,
        ...(description !== undefined && {
          description: description ?? undefined,
        }),
        ...(conditions !== undefined && {
          conditions: sanitizeConditions(conditions),
        }),
        ...(actions !== undefined && {
          actions: sanitizeActions(actions),
        }),
        updatedAt: new Date(),
      })
      .where(eq(rules.id, validatedId.data))
      .returning();

    if (!updated) {
      return NextResponse.json(
        { error: "Pravilo nije pronađeno" },
        { status: 404 },
      );
    }

    return NextResponse.json(updated);
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === "UNAUTHORIZED") {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }
      if (error.message === "FORBIDDEN") {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
    }
    console.error("Failed to update rule:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    await requireAdmin();

    const { id } = await params;
    const validatedId = ruleIdSchema.safeParse(id);

    if (!validatedId.success) {
      return NextResponse.json(
        { error: validatedId.error.issues[0].message },
        { status: 400 },
      );
    }

    const [deleted] = await db
      .delete(rules)
      .where(eq(rules.id, validatedId.data))
      .returning();

    if (!deleted) {
      return NextResponse.json(
        { error: "Pravilo nije pronađeno" },
        { status: 404 },
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === "UNAUTHORIZED") {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }
      if (error.message === "FORBIDDEN") {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
    }
    console.error("Failed to delete rule:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
