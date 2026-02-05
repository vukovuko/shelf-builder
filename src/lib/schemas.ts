import { z } from "zod";

/**
 * Runtime validation schemas for JSON data stored in the database.
 * Use these to validate data when reading from the database to ensure
 * type safety even if the stored data structure has changed over time.
 */

// Cut list item schema (used in wardrobes and orders)
export const cutListItemSchema = z.object({
  code: z.string(),
  desc: z.string(),
  widthCm: z.number(),
  heightCm: z.number(),
  thicknessMm: z.number(),
  areaM2: z.number(),
  cost: z.number(),
  element: z.string(),
  materialType: z.enum(["korpus", "front", "back"]),
});

// Wardrobe cut list schema
export const wardrobeCutListSchema = z.object({
  items: z.array(cutListItemSchema),
  pricePerM2: z.number(),
  frontPricePerM2: z.number(),
  backPricePerM2: z.number(),
  totalArea: z.number(),
  totalCost: z.number(),
});

// Order cut list schema (without totals)
export const orderCutListSchema = z.object({
  items: z.array(cutListItemSchema),
  pricePerM2: z.number(),
  frontPricePerM2: z.number(),
  backPricePerM2: z.number(),
});

// Price breakdown schema (stored on orders)
export const priceBreakdownSchema = z.object({
  korpus: z.object({
    areaM2: z.number(),
    price: z.number(),
    materialName: z.string(),
  }),
  front: z.object({
    areaM2: z.number(),
    price: z.number(),
    materialName: z.string(),
  }),
  back: z.object({
    areaM2: z.number(),
    price: z.number(),
    materialName: z.string(),
  }),
  handles: z
    .object({
      count: z.number(),
      price: z.number(),
    })
    .optional(),
});

// Rule adjustment schema (stored on orders)
export const ruleAdjustmentSchema = z.object({
  ruleId: z.string(),
  ruleName: z.string(),
  actionType: z.string(),
  description: z.string(),
  amount: z.number(),
  visible: z.boolean(),
});

export const ruleAdjustmentsSchema = z.array(ruleAdjustmentSchema);

// Rule condition schema
export const ruleConditionSchema = z.object({
  id: z.string(),
  field: z.string(),
  operator: z.string(),
  value: z.union([
    z.string(),
    z.number(),
    z.boolean(),
    z.array(z.string()),
    z.array(z.number()),
  ]),
  logicOperator: z.enum(["AND", "OR"]).optional(),
});

// Rule action schema
export const ruleActionSchema = z.object({
  id: z.string(),
  type: z.string(),
  config: z.object({
    itemName: z.string().optional(),
    itemSku: z.string().optional(),
    itemPrice: z.number().optional(),
    quantity: z.union([z.number(), z.string()]).optional(),
    visibleToCustomer: z.boolean().optional(),
    value: z.number().optional(),
    applyTo: z.string().optional(),
    reason: z.string().optional(),
  }),
});

// Door option enum (matches store.ts DoorOption type)
export const doorOptionSchema = z.enum([
  "none",
  "left",
  "right",
  "double",
  "leftMirror",
  "rightMirror",
  "doubleMirror",
  "drawerStyle",
]);

// Compartment extras schema (matches store.ts CompartmentExtras interface)
export const compartmentExtrasSchema = z.object({
  verticalDivider: z.boolean().optional(),
  drawers: z.boolean().optional(),
  drawersCount: z.number().optional(),
  rod: z.boolean().optional(),
  led: z.boolean().optional(),
});

// Wardrobe snapshot schema (partial - key fields for validation)
export const wardrobeSnapshotSchema = z.object({
  width: z.number(),
  height: z.number(),
  depth: z.number(),
  selectedMaterialId: z.union([z.number(), z.string()]).optional(),
  selectedFrontMaterialId: z.union([z.number(), z.string()]).optional(),
  selectedBackMaterialId: z
    .union([z.number(), z.string()])
    .nullable()
    .optional(),
  elementConfigs: z.record(z.string(), z.any()).optional(),
  compartmentExtras: z.record(z.string(), compartmentExtrasSchema).optional(),
  doorSelections: z.record(z.string(), doorOptionSchema).optional(),
  hasBase: z.boolean().optional(),
  baseHeight: z.number().optional(),
  verticalBoundaries: z.array(z.number()).optional(),
  columnHorizontalBoundaries: z.record(z.string(), z.any()).optional(),
});

// Type exports
export type CutListItem = z.infer<typeof cutListItemSchema>;
export type WardrobeCutList = z.infer<typeof wardrobeCutListSchema>;
export type OrderCutList = z.infer<typeof orderCutListSchema>;
export type PriceBreakdown = z.infer<typeof priceBreakdownSchema>;
export type RuleAdjustment = z.infer<typeof ruleAdjustmentSchema>;
export type RuleCondition = z.infer<typeof ruleConditionSchema>;
export type RuleAction = z.infer<typeof ruleActionSchema>;
export type DoorOption = z.infer<typeof doorOptionSchema>;
export type CompartmentExtras = z.infer<typeof compartmentExtrasSchema>;
export type WardrobeSnapshot = z.infer<typeof wardrobeSnapshotSchema>;

/**
 * Safe parse helpers that return null on validation failure
 * instead of throwing, for graceful degradation when reading old data
 */
export function safeParseWardrobeCutList(
  data: unknown,
): WardrobeCutList | null {
  const result = wardrobeCutListSchema.safeParse(data);
  return result.success ? result.data : null;
}

export function safeParseOrderCutList(data: unknown): OrderCutList | null {
  const result = orderCutListSchema.safeParse(data);
  return result.success ? result.data : null;
}

export function safeParsePriceBreakdown(data: unknown): PriceBreakdown | null {
  const result = priceBreakdownSchema.safeParse(data);
  return result.success ? result.data : null;
}

export function safeParseRuleAdjustments(
  data: unknown,
): RuleAdjustment[] | null {
  const result = ruleAdjustmentsSchema.safeParse(data);
  return result.success ? result.data : null;
}

export function safeParseWardrobeSnapshot(
  data: unknown,
): WardrobeSnapshot | null {
  const result = wardrobeSnapshotSchema.safeParse(data);
  return result.success ? result.data : null;
}
