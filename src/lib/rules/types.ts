/**
 * Rule Engine Type Definitions
 *
 * Shopify Functions-like rule system for automatic pricing adjustments,
 * hidden items, and discounts based on wardrobe/customer/order conditions.
 */

// ============================================================================
// OPERATORS
// ============================================================================

export type Operator =
  | "equals"
  | "not_equals"
  | "contains"
  | "not_contains"
  | "greater_than"
  | "less_than"
  | "greater_equal"
  | "less_equal"
  | "in"
  | "not_in"
  | "is_empty"
  | "is_not_empty";

export const OPERATOR_LABELS: Record<Operator, string> = {
  equals: "jednako",
  not_equals: "nije jednako",
  contains: "sadrži",
  not_contains: "ne sadrži",
  greater_than: "veće od",
  less_than: "manje od",
  greater_equal: "veće ili jednako",
  less_equal: "manje ili jednako",
  in: "jedno od",
  not_in: "nije jedno od",
  is_empty: "je prazno",
  is_not_empty: "nije prazno",
};

// Which operators work with which field types
export const OPERATORS_BY_TYPE: Record<string, Operator[]> = {
  number: [
    "equals",
    "not_equals",
    "greater_than",
    "less_than",
    "greater_equal",
    "less_equal",
  ],
  string: [
    "equals",
    "not_equals",
    "contains",
    "not_contains",
    "is_empty",
    "is_not_empty",
  ],
  boolean: ["equals", "not_equals"],
  array: ["contains", "not_contains", "is_empty", "is_not_empty"],
};

// ============================================================================
// CONDITION FIELDS
// ============================================================================

export type FieldCategory = "wardrobe" | "customer" | "order";

export interface FieldDefinition {
  key: string;
  label: string;
  category: FieldCategory;
  type: "number" | "string" | "boolean" | "array";
  unit?: string; // cm, RSD, etc.
}

export const AVAILABLE_FIELDS: FieldDefinition[] = [
  // Wardrobe Dimensions
  {
    key: "wardrobe.width",
    label: "Širina",
    category: "wardrobe",
    type: "number",
    unit: "cm",
  },
  {
    key: "wardrobe.height",
    label: "Visina",
    category: "wardrobe",
    type: "number",
    unit: "cm",
  },
  {
    key: "wardrobe.depth",
    label: "Dubina",
    category: "wardrobe",
    type: "number",
    unit: "cm",
  },
  {
    key: "wardrobe.area",
    label: "Površina",
    category: "wardrobe",
    type: "number",
    unit: "m²",
  },

  // Wardrobe Structure
  {
    key: "wardrobe.columnCount",
    label: "Broj kolona",
    category: "wardrobe",
    type: "number",
  },
  {
    key: "wardrobe.shelfCount",
    label: "Broj polica",
    category: "wardrobe",
    type: "number",
  },
  {
    key: "wardrobe.compartmentCount",
    label: "Broj odeljaka",
    category: "wardrobe",
    type: "number",
  },
  {
    key: "wardrobe.doorCount",
    label: "Broj vrata",
    category: "wardrobe",
    type: "number",
  },
  {
    key: "wardrobe.drawerCount",
    label: "Broj fioka",
    category: "wardrobe",
    type: "number",
  },
  {
    key: "wardrobe.boardCount",
    label: "Broj ploča bez polica i leđa",
    category: "wardrobe",
    type: "number",
  },
  {
    key: "wardrobe.hasBase",
    label: "Ima bazu",
    category: "wardrobe",
    type: "boolean",
  },
  {
    key: "wardrobe.hasDoors",
    label: "Ima vrata",
    category: "wardrobe",
    type: "boolean",
  },
  {
    key: "wardrobe.hasDrawers",
    label: "Ima fioke",
    category: "wardrobe",
    type: "boolean",
  },
  {
    key: "wardrobe.hasMirror",
    label: "Ima ogledalo",
    category: "wardrobe",
    type: "boolean",
  },
  {
    key: "wardrobe.slidingDoors",
    label: "Izabrana klizna vrata",
    category: "wardrobe",
    type: "boolean",
  },

  // Materials
  {
    key: "wardrobe.material.id",
    label: "Korpus materijal (ID)",
    category: "wardrobe",
    type: "number",
  },
  {
    key: "wardrobe.material.name",
    label: "Korpus materijal (ime)",
    category: "wardrobe",
    type: "string",
  },
  {
    key: "wardrobe.frontMaterial.id",
    label: "Front materijal (ID)",
    category: "wardrobe",
    type: "number",
  },
  {
    key: "wardrobe.frontMaterial.name",
    label: "Front materijal (ime)",
    category: "wardrobe",
    type: "string",
  },
  {
    key: "wardrobe.backMaterial.id",
    label: "Leđa materijal (ID)",
    category: "wardrobe",
    type: "number",
  },
  {
    key: "wardrobe.backMaterial.name",
    label: "Leđa materijal (ime)",
    category: "wardrobe",
    type: "string",
  },

  // Wardrobe Extras
  {
    key: "wardrobe.rodCount",
    label: "Broj šipki",
    category: "wardrobe",
    type: "number",
  },
  {
    key: "wardrobe.hasRod",
    label: "Ima šipku",
    category: "wardrobe",
    type: "boolean",
  },
  {
    key: "wardrobe.ledCount",
    label: "Broj LED",
    category: "wardrobe",
    type: "number",
  },
  {
    key: "wardrobe.hasLed",
    label: "Ima LED",
    category: "wardrobe",
    type: "boolean",
  },
  {
    key: "wardrobe.verticalDividerCount",
    label: "Broj vertikalnih pregrada",
    category: "wardrobe",
    type: "number",
  },
  {
    key: "wardrobe.hasVerticalDivider",
    label: "Ima vertikalnu pregradu",
    category: "wardrobe",
    type: "boolean",
  },
  {
    key: "wardrobe.baseHeight",
    label: "Visina baze",
    category: "wardrobe",
    type: "number",
    unit: "cm",
  },

  // Door details
  {
    key: "wardrobe.maxDoorHeight",
    label: "Maks. visina vrata",
    category: "wardrobe",
    type: "number",
    unit: "cm",
  },
  {
    key: "wardrobe.minDoorHeight",
    label: "Min. visina vrata",
    category: "wardrobe",
    type: "number",
    unit: "cm",
  },
  {
    key: "wardrobe.doubleDoorCount",
    label: "Broj dvokrilnih vrata",
    category: "wardrobe",
    type: "number",
  },
  {
    key: "wardrobe.singleDoorCount",
    label: "Broj jednokrilnih vrata",
    category: "wardrobe",
    type: "number",
  },
  {
    key: "wardrobe.mirrorDoorCount",
    label: "Broj ogledalo vrata",
    category: "wardrobe",
    type: "number",
  },
  {
    key: "wardrobe.drawerStyleDoorCount",
    label: "Broj push-to-open vrata",
    category: "wardrobe",
    type: "number",
  },

  // Handle info
  {
    key: "wardrobe.handleCount",
    label: "Ukupno ručki",
    category: "wardrobe",
    type: "number",
  },
  {
    key: "wardrobe.handleName",
    label: "Izabrana ručka (ime)",
    category: "wardrobe",
    type: "string",
  },
  {
    key: "wardrobe.handleFinishName",
    label: "Završna obrada ručke",
    category: "wardrobe",
    type: "string",
  },

  // Customer
  {
    key: "customer.tags",
    label: "Oznake kupca",
    category: "customer",
    type: "array",
  },
  {
    key: "customer.email",
    label: "Email kupca",
    category: "customer",
    type: "string",
  },
  {
    key: "customer.orderCount",
    label: "Broj prethodnih porudžbina",
    category: "customer",
    type: "number",
  },

  // Order
  {
    key: "order.total",
    label: "Ukupna cena",
    category: "order",
    type: "number",
    unit: "RSD",
  },
  {
    key: "order.city",
    label: "Grad dostave",
    category: "order",
    type: "string",
  },
];

// Group fields by category for UI dropdowns
export const FIELDS_BY_CATEGORY = AVAILABLE_FIELDS.reduce(
  (acc, field) => {
    if (!acc[field.category]) {
      acc[field.category] = [];
    }
    acc[field.category].push(field);
    return acc;
  },
  {} as Record<FieldCategory, FieldDefinition[]>,
);

export const CATEGORY_LABELS: Record<FieldCategory, string> = {
  wardrobe: "Orman",
  customer: "Kupac",
  order: "Porudžbina",
};

// ============================================================================
// CONDITIONS
// ============================================================================

export interface RuleCondition {
  id: string;
  field: string; // e.g., "wardrobe.height"
  operator: Operator;
  value: string | number | boolean | string[] | number[];
  logicOperator?: "AND" | "OR"; // How to combine with NEXT condition
}

// ============================================================================
// ACTIONS
// ============================================================================

export type ActionType =
  | "add_item"
  | "discount_percentage"
  | "discount_fixed"
  | "surcharge_percentage"
  | "surcharge_fixed";

export const ACTION_LABELS: Record<ActionType, string> = {
  add_item: "Dodaj stavku",
  discount_percentage: "Popust (%)",
  discount_fixed: "Popust (fiksno)",
  surcharge_percentage: "Doplata (%)",
  surcharge_fixed: "Doplata (fiksno)",
};

export type ApplyTo = "total" | "korpus" | "front" | "back" | "handles";

export const APPLY_TO_LABELS: Record<ApplyTo, string> = {
  total: "Ukupno",
  korpus: "Korpus",
  front: "Front/Vrata",
  back: "Leđa",
  handles: "Ručice",
};

// Available fields for quantity formulas (simple: fieldName * number)
export const FORMULA_FIELDS = [
  { key: "doorCount", path: "wardrobe.doorCount", label: "Broj vrata" },
  { key: "drawerCount", path: "wardrobe.drawerCount", label: "Broj fioka" },
  {
    key: "boardCount",
    path: "wardrobe.boardCount",
    label: "Broj ploča bez polica i leđa",
  },
  { key: "shelfCount", path: "wardrobe.shelfCount", label: "Broj polica" },
  {
    key: "compartmentCount",
    path: "wardrobe.compartmentCount",
    label: "Broj odeljaka",
  },
  { key: "columnCount", path: "wardrobe.columnCount", label: "Broj kolona" },
  { key: "rodCount", path: "wardrobe.rodCount", label: "Broj šipki" },
  { key: "ledCount", path: "wardrobe.ledCount", label: "Broj LED" },
  {
    key: "verticalDividerCount",
    path: "wardrobe.verticalDividerCount",
    label: "Broj vert. pregrada",
  },
  { key: "handleCount", path: "wardrobe.handleCount", label: "Ukupno ručki" },
  {
    key: "doubleDoorCount",
    path: "wardrobe.doubleDoorCount",
    label: "Broj dvokrilnih vrata",
  },
  {
    key: "singleDoorCount",
    path: "wardrobe.singleDoorCount",
    label: "Broj jednokrilnih vrata",
  },
  {
    key: "mirrorDoorCount",
    path: "wardrobe.mirrorDoorCount",
    label: "Broj ogledalo vrata",
  },
  {
    key: "drawerStyleDoorCount",
    path: "wardrobe.drawerStyleDoorCount",
    label: "Broj push-to-open vrata",
  },
  { key: "area", path: "wardrobe.area", label: "Površina (m²)" },
  { key: "width", path: "wardrobe.width", label: "Širina (cm)" },
  { key: "height", path: "wardrobe.height", label: "Visina (cm)" },
  { key: "depth", path: "wardrobe.depth", label: "Dubina (cm)" },
  { key: "baseHeight", path: "wardrobe.baseHeight", label: "Visina baze (cm)" },
  {
    key: "maxDoorHeight",
    path: "wardrobe.maxDoorHeight",
    label: "Maks. visina vrata (cm)",
  },
  {
    key: "minDoorHeight",
    path: "wardrobe.minDoorHeight",
    label: "Min. visina vrata (cm)",
  },
  {
    key: "customer.orderCount",
    path: "customer.orderCount",
    label: "Broj prethodnih porudžbina",
  },
  { key: "order.total", path: "order.total", label: "Ukupna cena (RSD)" },
] as const;

export interface RuleActionConfig {
  // For add_item:
  itemName?: string; // "Šarke tip A"
  itemSku?: string; // Optional SKU
  itemPrice?: number; // Price per unit (RSD)
  quantity?: number | string; // Fixed number or formula: "doorCount * 3"
  visibleToCustomer?: boolean; // false = hidden from receipt

  // For discounts/surcharges:
  value?: number; // Amount or percentage
  applyTo?: ApplyTo; // What to apply to
  reason?: string; // "Wholesale discount", "Seasonal promo"
}

export interface RuleAction {
  id: string;
  type: ActionType;
  config: RuleActionConfig;
}

// ============================================================================
// RULE
// ============================================================================

export interface Rule {
  id: string;
  name: string;
  description?: string | null;
  enabled: boolean;
  priority: number; // Lower = runs first
  conditions: RuleCondition[];
  actions: RuleAction[];
  createdAt: Date;
  updatedAt: Date;
}

// ============================================================================
// RULE CONTEXT (Data passed to engine at checkout)
// ============================================================================

export interface RuleContextWardrobe {
  width: number; // cm
  height: number; // cm
  depth: number; // cm
  area: number; // m²
  columnCount: number;
  shelfCount: number;
  compartmentCount: number;
  doorCount: number;
  drawerCount: number;
  boardCount: number;
  hasBase: boolean;
  hasDoors: boolean;
  hasDrawers: boolean;
  hasMirror: boolean;
  slidingDoors: boolean;
  hasRod: boolean;
  hasLed: boolean;
  hasVerticalDivider: boolean;
  rodCount: number;
  ledCount: number;
  verticalDividerCount: number;
  baseHeight: number; // cm (0 if no base)
  // Door details
  maxDoorHeight: number; // cm (0 if no doors)
  minDoorHeight: number; // cm (0 if no doors)
  doubleDoorCount: number;
  singleDoorCount: number;
  mirrorDoorCount: number;
  drawerStyleDoorCount: number;
  // Handle info
  handleCount: number; // 1/single, 2/double, 0/drawerStyle
  handleName: string;
  handleFinishName: string;
  material: { id: number; name: string };
  frontMaterial: { id: number; name: string };
  backMaterial?: { id: number; name: string };
}

export interface RuleContextCustomer {
  tags: string[];
  email?: string;
  orderCount: number;
}

export interface RuleContextOrder {
  total: number; // RSD
  city?: string;
}

export interface RuleContext {
  wardrobe: RuleContextWardrobe;
  customer: RuleContextCustomer;
  order: RuleContextOrder;
}

// ============================================================================
// APPLIED RULE RESULT (Stored on order)
// ============================================================================

export interface RuleAdjustment {
  ruleId: string;
  ruleName: string;
  actionType: ActionType;
  description: string; // Human-readable: "Added 6x Šarke (1200 RSD)"
  amount: number; // Positive = surcharge, Negative = discount
  visible: boolean; // Show to customer?
}
