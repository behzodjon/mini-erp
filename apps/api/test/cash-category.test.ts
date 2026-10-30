import { describe, expect, it } from "vitest";
import { directionOf, pnlEffectOf, requiresCounterparty, type PnlEffect } from "../src/domain/cash-category.js";

// Expected values come from the category table in the spec ("Money and cash"), not from the code.
const TABLE = [
  ["sale", "in", "revenue", false],
  ["purchase", "out", "none", false],
  ["loan_received", "in", "none", true],
  ["loan_repayment_received", "in", "none", true],
  ["loan_given", "out", "none", true],
  ["loan_repayment_paid", "out", "none", true],
  ["owner_contribution", "in", "none", false],
  ["owner_withdrawal", "out", "none", false],
  ["other_income", "in", "other_income", false],
  ["travel_cost", "out", "operating_expense", false],
  ["rent", "out", "operating_expense", false],
  ["salary", "out", "operating_expense", false],
  ["other_expense", "out", "operating_expense", false],
] as const satisfies readonly (readonly [string, "in" | "out", PnlEffect, boolean])[];

describe("cash category classification", () => {
  it.each(TABLE)("%s: %s, P&L %s, counterparty required: %s", (category, direction, pnl, needsCounterparty) => {
    expect(directionOf(category)).toBe(direction);
    expect(pnlEffectOf(category)).toBe(pnl);
    expect(requiresCounterparty(category)).toBe(needsCounterparty);
  });
});
