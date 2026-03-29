/**
 * Rule Engine - Field Extraction
 *
 * Functions to extract field values from rule context.
 */

import { FORMULA_FIELDS, type RuleContext } from "./types";

/**
 * Get field value from rule context using dot notation
 * e.g., "wardrobe.height" → context.wardrobe.height
 */
export function getFieldValue(
  context: RuleContext,
  fieldPath: string,
): unknown {
  const parts = fieldPath.split(".");

  // Navigate through the object using the path parts
  let value: unknown = context;

  for (const part of parts) {
    if (value === null || value === undefined) {
      return undefined;
    }
    if (typeof value !== "object") {
      return undefined;
    }
    value = (value as Record<string, unknown>)[part];
  }

  return value;
}

/**
 * Parse and evaluate a simple formula
 * Supports: fieldName * number (e.g., "doorCount * 3")
 *
 * Returns the calculated quantity or null if invalid
 */
export function evaluateFormula(
  formula: string | number,
  context: RuleContext,
): number | null {
  // If already a number, return it
  if (typeof formula === "number") {
    return formula;
  }

  // Parse formula: fieldName * number
  const trimmed = formula.trim();

  // Check for multiplication pattern
  const multiplyMatch = trimmed.match(/^([\w.]+)\s*\*\s*(\d+(?:\.\d+)?)$/);
  if (multiplyMatch) {
    const [, fieldName, multiplierStr] = multiplyMatch;
    const multiplier = parseFloat(multiplierStr);
    const fieldValue = getFormulaFieldValue(fieldName, context);

    if (fieldValue !== null && !isNaN(multiplier)) {
      return Math.round(fieldValue * multiplier);
    }
  }

  // Check for just a number
  const directNumber = parseFloat(trimmed);
  if (!isNaN(directNumber)) {
    return directNumber;
  }

  // Check for just a field name
  const fieldValue = getFormulaFieldValue(trimmed, context);
  if (fieldValue !== null) {
    return fieldValue;
  }

  console.warn(`[RuleEngine] Invalid formula: ${formula}`);
  return null;
}

/**
 * Get value for a formula field name
 */
function getFormulaFieldValue(
  fieldName: string,
  context: RuleContext,
): number | null {
  const matchingField = FORMULA_FIELDS.find((field) => field.key === fieldName);
  const fieldPath = matchingField?.path ?? fieldName;
  const fieldValue = getFieldValue(context, fieldPath);

  return typeof fieldValue === "number" && Number.isFinite(fieldValue)
    ? fieldValue
    : null;
}
