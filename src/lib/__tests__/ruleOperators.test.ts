import { describe, expect, it } from "vitest";

import { evaluateOperator } from "../rules/operators";

describe("evaluateOperator", () => {
  it("matches boolean equals when condition value is stored as a string", () => {
    expect(evaluateOperator(true, "equals", "true")).toBe(true);
    expect(evaluateOperator(false, "equals", "false")).toBe(true);
    expect(evaluateOperator(true, "equals", "false")).toBe(false);
  });

  it("matches numeric equals when condition value is stored as a string", () => {
    expect(evaluateOperator(2, "equals", "2")).toBe(true);
    expect(evaluateOperator("3", "equals", 3)).toBe(true);
    expect(evaluateOperator(2, "equals", "4")).toBe(false);
  });

  it("keeps string equality case-insensitive", () => {
    expect(evaluateOperator("Beograd", "equals", "beograd")).toBe(true);
  });
});