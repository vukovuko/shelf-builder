import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db/db";
import { accessoryRules } from "@/db/schema";
import { requireAdmin } from "@/lib/roles";

const accessoryRuleIdSchema = z.string().uuid("Neispravan ID pravila");

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

const updateAccessoryRuleSchema = z.object({
  name: z.string().min(1).optional(),
  description: z.string().nullish(),
  enabled: z.boolean().optional(),
  priority: z.number().int().optional(),
  target: z
    .enum(["elements", "doors", "drawers", "shelves", "sliding_doors"])
    .optional(),
  conditions: z.array(conditionSchema).optional(),
  config: z
    .object({
      itemName: z.string().min(1),
      codePrefix: z.string().nullish(),
      materialType: z.enum(["korpus", "front", "back"]).optional(),
      widthFormula: z.string().min(1),
      heightFormula: z.string().min(1),
      thicknessFormula: z.string().nullish(),
      quantity: z.union([z.number(), z.string()]).nullish(),
    })
    .optional(),
});

function sanitizeConditions(conditions: z.infer<typeof conditionSchema>[]) {
  return conditions.map((condition) => ({
    ...condition,
    value: condition.value === null ? "" : condition.value,
  }));
}

function sanitizeConfig(
  config: NonNullable<z.infer<typeof updateAccessoryRuleSchema>["config"]>,
) {
  return {
    itemName: config.itemName,
    codePrefix: config.codePrefix ?? undefined,
    materialType: config.materialType,
    widthFormula: config.widthFormula,
    heightFormula: config.heightFormula,
    thicknessFormula: config.thicknessFormula ?? undefined,
    quantity: config.quantity ?? undefined,
  };
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    await requireAdmin();

    const { id } = await params;
    const validatedId = accessoryRuleIdSchema.safeParse(id);
    if (!validatedId.success) {
      return NextResponse.json(
        { error: validatedId.error.issues[0].message },
        { status: 400 },
      );
    }

    const [rule] = await db
      .select()
      .from(accessoryRules)
      .where(eq(accessoryRules.id, validatedId.data));

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

    console.error("Failed to fetch accessory rule:", error);
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
    const validatedId = accessoryRuleIdSchema.safeParse(id);
    if (!validatedId.success) {
      return NextResponse.json(
        { error: validatedId.error.issues[0].message },
        { status: 400 },
      );
    }

    const body = await request.json();
    const validation = updateAccessoryRuleSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        { error: validation.error.issues[0].message },
        { status: 400 },
      );
    }

    const { description, conditions, config, ...restUpdates } = validation.data;

    const [updated] = await db
      .update(accessoryRules)
      .set({
        ...restUpdates,
        ...(description !== undefined && {
          description: description ?? undefined,
        }),
        ...(conditions !== undefined && {
          conditions: sanitizeConditions(conditions),
        }),
        ...(config !== undefined && { config: sanitizeConfig(config) }),
        updatedAt: new Date(),
      })
      .where(eq(accessoryRules.id, validatedId.data))
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

    console.error("Failed to update accessory rule:", error);
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
    const validatedId = accessoryRuleIdSchema.safeParse(id);
    if (!validatedId.success) {
      return NextResponse.json(
        { error: validatedId.error.issues[0].message },
        { status: 400 },
      );
    }

    const [deleted] = await db
      .delete(accessoryRules)
      .where(eq(accessoryRules.id, validatedId.data))
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

    console.error("Failed to delete accessory rule:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
