/**
 * Rule Engine - Core Engine
 *
 * Evaluates rules and applies actions to calculate price adjustments.
 */

import type {
  Rule,
  RuleCondition,
  RuleAction,
  RuleContext,
  RuleAdjustment,
} from "./types";
import { evaluateOperator } from "./operators";
import { getFieldValue, evaluateFormula } from "./fields";

/**
 * Apply all enabled rules to the given context
 *
 * @param rules - Array of rules (should be pre-sorted by priority)
 * @param context - Rule context with wardrobe, customer, and order data
 * @param baseTotal - Base price before adjustments
 * @returns Array of adjustments to apply
 */
export function applyRules(
  rules: Rule[],
  context: RuleContext,
  baseTotal: number,
): RuleAdjustment[] {
  const adjustments: RuleAdjustment[] = [];

  // Running total for percentage calculations (starts with base, updates as we go)
  let runningTotal = baseTotal;

  for (const rule of rules) {
    // Skip disabled rules
    if (!rule.enabled) continue;

    // Check if all conditions pass
    if (!evaluateConditions(rule.conditions, context)) {
      continue;
    }

    // Execute all actions for this rule
    for (const action of rule.actions) {
      const adjustment = executeAction(action, rule, context, runningTotal);
      if (adjustment) {
        adjustments.push(adjustment);
        // Update running total for next percentage calculations
        runningTotal += adjustment.amount;
      }
    }
  }

  return adjustments;
}

/**
 * Evaluate all conditions for a rule
 * Supports AND/OR logic between conditions
 */
function evaluateConditions(
  conditions: RuleCondition[],
  context: RuleContext,
): boolean {
  if (conditions.length === 0) {
    // No conditions = always matches
    return true;
  }

  // Start with the first condition
  let result = evaluateSingleCondition(conditions[0], context);

  // Process remaining conditions with their logic operators
  for (let i = 1; i < conditions.length; i++) {
    const prevCondition = conditions[i - 1];
    const currentCondition = conditions[i];
    const currentResult = evaluateSingleCondition(currentCondition, context);

    // Use the logic operator from the PREVIOUS condition
    const logicOp = prevCondition.logicOperator ?? "AND";

    if (logicOp === "AND") {
      result = result && currentResult;
    } else {
      // OR
      result = result || currentResult;
    }
  }

  return result;
}

/**
 * Evaluate a single condition
 */
function evaluateSingleCondition(
  condition: RuleCondition,
  context: RuleContext,
): boolean {
  const fieldValue = getFieldValue(context, condition.field);
  return evaluateOperator(fieldValue, condition.operator, condition.value);
}

/**
 * Execute an action and return the adjustment
 */
function executeAction(
  action: RuleAction,
  rule: Rule,
  context: RuleContext,
  currentTotal: number,
): RuleAdjustment | null {
  const { type, config } = action;

  switch (type) {
    case "add_item": {
      const quantity = evaluateFormula(config.quantity ?? 1, context.wardrobe);
      if (quantity === null || quantity <= 0) return null;

      const unitPrice = config.itemPrice ?? 0;
      const totalAmount = quantity * unitPrice;

      return {
        ruleId: rule.id,
        ruleName: rule.name,
        actionType: type,
        description: `${config.itemName ?? "Stavka"} × ${quantity} (${totalAmount.toLocaleString("sr-RS")} RSD)`,
        amount: totalAmount, // Positive = adds to total
        visible: config.visibleToCustomer ?? false,
      };
    }

    case "discount_percentage": {
      const percentage = config.value ?? 0;
      if (percentage <= 0) return null;

      // Calculate base for percentage
      const base = getBaseForApplyTo(config.applyTo ?? "total", currentTotal);
      const discountAmount = Math.round((base * percentage) / 100);

      return {
        ruleId: rule.id,
        ruleName: rule.name,
        actionType: type,
        description:
          config.reason ??
          `Popust ${percentage}% (-${discountAmount.toLocaleString("sr-RS")} RSD)`,
        amount: -discountAmount, // Negative = reduces total
        visible: true,
      };
    }

    case "discount_fixed": {
      const discountAmount = config.value ?? 0;
      if (discountAmount <= 0) return null;

      return {
        ruleId: rule.id,
        ruleName: rule.name,
        actionType: type,
        description:
          config.reason ??
          `Popust (-${discountAmount.toLocaleString("sr-RS")} RSD)`,
        amount: -discountAmount,
        visible: true,
      };
    }

    case "surcharge_percentage": {
      const percentage = config.value ?? 0;
      if (percentage <= 0) return null;

      const base = getBaseForApplyTo(config.applyTo ?? "total", currentTotal);
      const surchargeAmount = Math.round((base * percentage) / 100);

      return {
        ruleId: rule.id,
        ruleName: rule.name,
        actionType: type,
        description:
          config.reason ??
          `Doplata ${percentage}% (+${surchargeAmount.toLocaleString("sr-RS")} RSD)`,
        amount: surchargeAmount,
        visible: true,
      };
    }

    case "surcharge_fixed": {
      const surchargeAmount = config.value ?? 0;
      if (surchargeAmount <= 0) return null;

      return {
        ruleId: rule.id,
        ruleName: rule.name,
        actionType: type,
        description:
          config.reason ??
          `Doplata (+${surchargeAmount.toLocaleString("sr-RS")} RSD)`,
        amount: surchargeAmount,
        visible: true,
      };
    }

    default:
      console.warn(`[RuleEngine] Unknown action type: ${type}`);
      return null;
  }
}

/**
 * Get the base amount for percentage calculations
 * For now, we only support "total" - extend later if needed for per-material
 */
function getBaseForApplyTo(applyTo: string, currentTotal: number): number {
  // TODO: Support per-material percentages if needed
  // For now, everything applies to total
  return currentTotal;
}

/**
 * Calculate the final price after applying all adjustments
 */
export function calculateFinalPrice(
  baseTotal: number,
  adjustments: RuleAdjustment[],
): number {
  const totalAdjustment = adjustments.reduce((sum, adj) => sum + adj.amount, 0);
  return Math.max(0, baseTotal + totalAdjustment);
}

/**
 * Filter adjustments to only visible ones (for customer receipt)
 */
export function getVisibleAdjustments(
  adjustments: RuleAdjustment[],
): RuleAdjustment[] {
  return adjustments.filter((adj) => adj.visible);
}

/**
 * Filter adjustments to hidden ones (for admin "Interne stavke" section)
 */
export function getHiddenAdjustments(
  adjustments: RuleAdjustment[],
): RuleAdjustment[] {
  return adjustments.filter((adj) => !adj.visible);
}
