/**
 * Rule Engine - Operator Functions
 *
 * Comparison functions for evaluating rule conditions.
 */

import type { Operator } from "./types";

/**
 * Evaluate a condition using the specified operator
 */
export function evaluateOperator(
  fieldValue: unknown,
  operator: Operator,
  conditionValue: unknown,
): boolean {
  switch (operator) {
    case "equals":
      return equals(fieldValue, conditionValue);

    case "not_equals":
      return !equals(fieldValue, conditionValue);

    case "contains":
      return contains(fieldValue, conditionValue);

    case "not_contains":
      return !contains(fieldValue, conditionValue);

    case "greater_than":
      return greaterThan(fieldValue, conditionValue);

    case "less_than":
      return lessThan(fieldValue, conditionValue);

    case "greater_equal":
      return greaterEqual(fieldValue, conditionValue);

    case "less_equal":
      return lessEqual(fieldValue, conditionValue);

    case "in":
      return isIn(fieldValue, conditionValue);

    case "not_in":
      return !isIn(fieldValue, conditionValue);

    case "is_empty":
      return isEmpty(fieldValue);

    case "is_not_empty":
      return !isEmpty(fieldValue);

    default:
      console.warn(`[RuleEngine] Unknown operator: ${operator}`);
      return false;
  }
}

// ============================================================================
// OPERATOR IMPLEMENTATIONS
// ============================================================================

/**
 * Strict equality check
 * Handles strings case-insensitively
 */
function equals(a: unknown, b: unknown): boolean {
  if (typeof a === "string" && typeof b === "string") {
    return a.toLowerCase() === b.toLowerCase();
  }
  return a === b;
}

/**
 * Contains check for strings and arrays
 * - String: "hello world" contains "world" → true
 * - Array: ["vip", "wholesale"] contains "vip" → true
 */
function contains(fieldValue: unknown, searchValue: unknown): boolean {
  // Array contains value
  if (Array.isArray(fieldValue)) {
    if (typeof searchValue === "string") {
      return fieldValue.some(
        (item) =>
          typeof item === "string" &&
          item.toLowerCase() === searchValue.toLowerCase(),
      );
    }
    return fieldValue.includes(searchValue);
  }

  // String contains substring
  if (typeof fieldValue === "string" && typeof searchValue === "string") {
    return fieldValue.toLowerCase().includes(searchValue.toLowerCase());
  }

  return false;
}

/**
 * Greater than (numeric comparison)
 */
function greaterThan(a: unknown, b: unknown): boolean {
  const numA = toNumber(a);
  const numB = toNumber(b);
  if (numA === null || numB === null) return false;
  return numA > numB;
}

/**
 * Less than (numeric comparison)
 */
function lessThan(a: unknown, b: unknown): boolean {
  const numA = toNumber(a);
  const numB = toNumber(b);
  if (numA === null || numB === null) return false;
  return numA < numB;
}

/**
 * Greater than or equal (numeric comparison)
 */
function greaterEqual(a: unknown, b: unknown): boolean {
  const numA = toNumber(a);
  const numB = toNumber(b);
  if (numA === null || numB === null) return false;
  return numA >= numB;
}

/**
 * Less than or equal (numeric comparison)
 */
function lessEqual(a: unknown, b: unknown): boolean {
  const numA = toNumber(a);
  const numB = toNumber(b);
  if (numA === null || numB === null) return false;
  return numA <= numB;
}

/**
 * Value is in array
 * e.g., fieldValue="Beograd", conditionValue=["Beograd", "Novi Sad"] → true
 */
function isIn(fieldValue: unknown, conditionValue: unknown): boolean {
  if (!Array.isArray(conditionValue)) return false;

  if (typeof fieldValue === "string") {
    return conditionValue.some(
      (item) =>
        typeof item === "string" &&
        item.toLowerCase() === fieldValue.toLowerCase(),
    );
  }

  return conditionValue.includes(fieldValue);
}

/**
 * Check if value is empty
 * - null/undefined → true
 * - empty string "" → true
 * - empty array [] → true
 * - zero 0 → false (zero is not empty)
 */
function isEmpty(value: unknown): boolean {
  if (value === null || value === undefined) return true;
  if (typeof value === "string") return value.trim() === "";
  if (Array.isArray(value)) return value.length === 0;
  return false;
}

// ============================================================================
// HELPERS
// ============================================================================

/**
 * Safely convert value to number
 * Returns null if conversion fails
 */
function toNumber(value: unknown): number | null {
  if (typeof value === "number" && !isNaN(value)) {
    return value;
  }
  if (typeof value === "string") {
    const parsed = parseFloat(value);
    if (!isNaN(parsed)) return parsed;
  }
  return null;
}
