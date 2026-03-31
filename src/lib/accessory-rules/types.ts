import {
  AVAILABLE_FIELDS,
  CATEGORY_LABELS,
  FIELDS_BY_CATEGORY,
  OPERATOR_LABELS,
  OPERATORS_BY_TYPE,
  type FieldDefinition,
  type Operator,
  type RuleCondition,
} from "@/lib/rules/types";

export type AccessoryRuleTarget =
  | "elements"
  | "doors"
  | "drawers"
  | "shelves"
  | "sliding_doors";

export const ACCESSORY_RULE_TARGET_LABELS: Record<
  AccessoryRuleTarget,
  string
> = {
  elements: "Svi elementi",
  doors: "Sva vrata",
  drawers: "Sve fioke",
  shelves: "Sve police",
  sliding_doors: "Sva klizna vrata",
};

export type AccessoryRuleMaterialType = "korpus" | "front" | "back";

export const ACCESSORY_RULE_MATERIAL_LABELS: Record<
  AccessoryRuleMaterialType,
  string
> = {
  korpus: "Korpus materijal",
  front: "Front/Vrata materijal",
  back: "Leđa materijal",
};

export interface AccessoryRuleConfig {
  itemName: string;
  codePrefix?: string;
  materialType?: AccessoryRuleMaterialType;
  widthFormula: string;
  heightFormula: string;
  thicknessFormula?: string;
  quantity?: number | string;
}

export interface AccessoryRule {
  id: string;
  name: string;
  description?: string | null;
  enabled: boolean;
  priority: number;
  target: AccessoryRuleTarget;
  conditions: RuleCondition[];
  config: AccessoryRuleConfig;
  createdAt: Date;
  updatedAt: Date;
}

export interface SerializedAccessoryRule
  extends Omit<AccessoryRule, "createdAt" | "updatedAt"> {
  createdAt: string;
  updatedAt: string;
}

export const ACCESSORY_RULE_FIELDS: FieldDefinition[] = AVAILABLE_FIELDS.filter(
  (field) => field.category === "wardrobe",
);

export const ACCESSORY_RULE_FIELDS_BY_CATEGORY = {
  wardrobe: FIELDS_BY_CATEGORY.wardrobe,
} as const;

export const ACCESSORY_RULE_CATEGORY_LABELS = {
  wardrobe: CATEGORY_LABELS.wardrobe,
} as const;

export {
  OPERATOR_LABELS,
  OPERATORS_BY_TYPE,
  type FieldDefinition,
  type Operator,
  type RuleCondition,
};
