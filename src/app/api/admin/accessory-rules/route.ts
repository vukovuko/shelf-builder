import { NextResponse } from "next/server";
import { asc } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db/db";
import { accessoryRules } from "@/db/schema";
import { requireAdmin } from "@/lib/roles";

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

const accessoryRuleSchema = z.object({
  name: z.string().min(1, "Naziv je obavezan"),
  description: z.string().nullish(),
  enabled: z.boolean().optional(),
  priority: z.number().int().optional(),
  target: z.enum(["elements", "doors", "drawers", "shelves", "sliding_doors"]),
  conditions: z.array(conditionSchema).min(0),
  config: z.object({
    itemName: z.string().min(1, "Naziv stavke je obavezan"),
    codePrefix: z.string().nullish(),
    materialType: z.enum(["korpus", "front", "back"]).optional(),
    widthFormula: z.string().min(1, "Formula za širinu je obavezna"),
    heightFormula: z.string().min(1, "Formula za visinu je obavezna"),
    thicknessFormula: z.string().nullish(),
    quantity: z.union([z.number(), z.string()]).nullish(),
  }),
});

function sanitizeConditions(conditions: z.infer<typeof conditionSchema>[]) {
  return conditions.map((condition) => ({
    ...condition,
    value: condition.value === null ? "" : condition.value,
  }));
}

function sanitizeConfig(config: z.infer<typeof accessoryRuleSchema>["config"]) {
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

export async function GET() {
  try {
    await requireAdmin();

    const allRules = await db
      .select()
      .from(accessoryRules)
      .orderBy(asc(accessoryRules.priority), asc(accessoryRules.createdAt));

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

    console.error("Failed to fetch accessory rules:", error);
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
    const validation = accessoryRuleSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: validation.error.issues[0].message },
        { status: 400 },
      );
    }

    const { name, description, enabled, priority, target, conditions, config } =
      validation.data;

    const [created] = await db
      .insert(accessoryRules)
      .values({
        name,
        description: description ?? undefined,
        enabled: enabled ?? true,
        priority: priority ?? 100,
        target,
        conditions: sanitizeConditions(conditions),
        config: sanitizeConfig(config),
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

    console.error("Failed to create accessory rule:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
