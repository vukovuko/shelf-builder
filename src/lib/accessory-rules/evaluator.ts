import { getFieldValue } from "@/lib/rules/fields";
import { evaluateOperator } from "@/lib/rules/operators";
import type { RuleCondition } from "@/lib/rules/types";

export interface AccessoryRuleConditionContext {
  wardrobe: Record<string, unknown>;
}

export interface AccessoryRuleFormulaContext {
  wardrobe: Record<string, unknown>;
  target: Record<string, unknown>;
  material: Record<string, unknown>;
}

type Token =
  | { type: "number"; value: number }
  | { type: "identifier"; value: string }
  | { type: "operator"; value: "+" | "-" | "*" | "/" }
  | { type: "paren"; value: "(" | ")" };

export function matchesAccessoryRuleConditions(
  conditions: RuleCondition[],
  context: AccessoryRuleConditionContext,
): boolean {
  if (conditions.length === 0) {
    return true;
  }

  let result = evaluateSingleCondition(conditions[0], context);

  for (let index = 1; index < conditions.length; index++) {
    const previousCondition = conditions[index - 1];
    const currentResult = evaluateSingleCondition(conditions[index], context);
    const logicOperator = previousCondition.logicOperator ?? "AND";

    result =
      logicOperator === "AND"
        ? result && currentResult
        : result || currentResult;
  }

  return result;
}

function evaluateSingleCondition(
  condition: RuleCondition,
  context: AccessoryRuleConditionContext,
) {
  const fieldValue = getFieldValue(context as never, condition.field);
  return evaluateOperator(fieldValue, condition.operator, condition.value);
}

export function evaluateNumericFormula(
  formula: number | string | null | undefined,
  context: AccessoryRuleFormulaContext,
): number | null {
  if (formula === null || formula === undefined) {
    return null;
  }

  if (typeof formula === "number") {
    return Number.isFinite(formula) ? formula : null;
  }

  const trimmed = formula.trim();
  if (!trimmed) {
    return null;
  }

  const maybeTokens = tokenize(trimmed);
  if (!maybeTokens) {
    return null;
  }
  const tokens = maybeTokens;

  let index = 0;

  function parseExpression(): number | null {
    let value = parseTerm();
    if (value === null) {
      return null;
    }

    while (
      index < tokens.length &&
      tokens[index].type === "operator" &&
      (tokens[index].value === "+" || tokens[index].value === "-")
    ) {
      const operator = tokens[index].value;
      index += 1;
      const rhs = parseTerm();
      if (rhs === null) {
        return null;
      }
      value = operator === "+" ? value + rhs : value - rhs;
    }

    return value;
  }

  function parseTerm(): number | null {
    let value = parseFactor();
    if (value === null) {
      return null;
    }

    while (
      index < tokens.length &&
      tokens[index].type === "operator" &&
      (tokens[index].value === "*" || tokens[index].value === "/")
    ) {
      const operator = tokens[index].value;
      index += 1;
      const rhs = parseFactor();
      if (rhs === null) {
        return null;
      }
      if (operator === "/" && rhs === 0) {
        return null;
      }
      value = operator === "*" ? value * rhs : value / rhs;
    }

    return value;
  }

  function parseFactor(): number | null {
    const token = tokens[index];
    if (!token) {
      return null;
    }

    if (token.type === "operator" && token.value === "-") {
      index += 1;
      const value = parseFactor();
      return value === null ? null : -value;
    }

    if (token.type === "number") {
      index += 1;
      return token.value;
    }

    if (token.type === "identifier") {
      index += 1;
      const value = getFieldValue(context as never, token.value);
      return typeof value === "number" && Number.isFinite(value) ? value : null;
    }

    if (token.type === "paren" && token.value === "(") {
      index += 1;
      const value = parseExpression();
      if (tokens[index]?.type !== "paren" || tokens[index]?.value !== ")") {
        return null;
      }
      index += 1;
      return value;
    }

    return null;
  }

  const result = parseExpression();
  if (result === null || index !== tokens.length || !Number.isFinite(result)) {
    return null;
  }

  return result;
}

function tokenize(input: string): Token[] | null {
  const tokens: Token[] = [];
  let index = 0;

  while (index < input.length) {
    const char = input[index];

    if (/\s/.test(char)) {
      index += 1;
      continue;
    }

    if (/[0-9.]/.test(char)) {
      let end = index + 1;
      while (end < input.length && /[0-9.]/.test(input[end])) {
        end += 1;
      }
      const value = Number(input.slice(index, end));
      if (!Number.isFinite(value)) {
        return null;
      }
      tokens.push({ type: "number", value });
      index = end;
      continue;
    }

    if (/[A-Za-z_]/.test(char)) {
      let end = index + 1;
      while (end < input.length && /[A-Za-z0-9_.]/.test(input[end])) {
        end += 1;
      }
      tokens.push({
        type: "identifier",
        value: input.slice(index, end),
      });
      index = end;
      continue;
    }

    if (char === "+" || char === "-" || char === "*" || char === "/") {
      tokens.push({ type: "operator", value: char });
      index += 1;
      continue;
    }

    if (char === "(" || char === ")") {
      tokens.push({ type: "paren", value: char });
      index += 1;
      continue;
    }

    return null;
  }

  return tokens;
}
