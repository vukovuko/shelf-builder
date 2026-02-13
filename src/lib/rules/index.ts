/**
 * Rule Engine Module
 *
 * Exports all rule engine functionality.
 */

// Types
export type {
  Operator,
  FieldCategory,
  FieldDefinition,
  RuleCondition,
  ActionType,
  ApplyTo,
  RuleActionConfig,
  RuleAction,
  Rule,
  RuleContext,
  RuleContextWardrobe,
  RuleContextCustomer,
  RuleContextOrder,
  RuleAdjustment,
} from "./types";

// Constants
export {
  OPERATOR_LABELS,
  OPERATORS_BY_TYPE,
  AVAILABLE_FIELDS,
  FIELDS_BY_CATEGORY,
  CATEGORY_LABELS,
  ACTION_LABELS,
  APPLY_TO_LABELS,
  FORMULA_FIELDS,
} from "./types";

// Engine functions
export {
  applyRules,
  calculateFinalPrice,
  getVisibleAdjustments,
  getHiddenAdjustments,
} from "./engine";

// Field extraction
export { getFieldValue, evaluateFormula } from "./fields";

// Operators
export { evaluateOperator } from "./operators";

// Door metrics
export { computeDoorMetrics } from "./computeDoorMetrics";
export type { DoorMetrics, HandleLookupEntry } from "./computeDoorMetrics";
