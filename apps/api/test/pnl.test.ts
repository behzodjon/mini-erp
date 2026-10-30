import type { CashCategory } from "@erp/shared";
import { describe, expect, it } from "vitest";
import { composePnl, debtBalances } from "../src/domain/pnl.js";

const noSales = { revenue: 0, costOfGoodsSold: 0, grossProfit: 0 };

describe("P&L composition", () => {
  it("runs revenue down to net profit", () => {
    const pnl = composePnl({
      sales: { revenue: 100_000, costOfGoodsSold: 60_000, grossProfit: 40_000 },
      cashTotals: [
        { category: "travel_cost", total: 5_000 },
        { category: "rent", total: 8_000 },
        { category: "other_income", total: 2_000 },
      ],
      stockCountResult: -3_000,
    });

    expect(pnl).toEqual({
      revenue: 100_000,
      costOfGoodsSold: 60_000,
      grossProfit: 40_000,
      expenses: [
        { category: "travel_cost", amount: 5_000 },
        { category: "rent", amount: 8_000 },
        { category: "salary", amount: 0 },
        { category: "other_expense", amount: 0 },
      ],
      totalExpenses: 13_000,
      stockCountResult: -3_000,
      otherIncome: 2_000,
      netProfit: 26_000, // 40,000 − 13,000 − 3,000 + 2,000
    });
  });

  it("can come out as a loss", () => {
    const pnl = composePnl({
      sales: { revenue: 10_000, costOfGoodsSold: 9_000, grossProfit: 1_000 },
      cashTotals: [{ category: "salary", total: 4_000 }],
      stockCountResult: -500,
    });

    expect(pnl.netProfit).toBe(-3_500);
  });

  it("adds a stock count surplus", () => {
    const pnl = composePnl({ sales: noSales, cashTotals: [], stockCountResult: 1_200 });

    expect(pnl.netProfit).toBe(1_200);
  });

  it("ignores every category that is not profit or loss", () => {
    const pnl = composePnl({
      sales: noSales,
      cashTotals: [
        { category: "sale", total: 70_000 }, // revenue comes from the sales themselves
        { category: "purchase", total: 50_000 },
        { category: "loan_received", total: 1_000_000 },
        { category: "loan_repayment_received", total: 100_000 },
        { category: "loan_given", total: 200_000 },
        { category: "loan_repayment_paid", total: 300_000 },
        { category: "owner_contribution", total: 400_000 },
        { category: "owner_withdrawal", total: 500_000 },
      ],
      stockCountResult: 0,
    });

    expect(pnl.netProfit).toBe(0);
    expect(pnl.totalExpenses).toBe(0);
    expect(pnl.otherIncome).toBe(0);
  });
});

describe("debt balances", () => {
  const entry = (category: CashCategory, counterpartyId: string | null, amount: number) => ({ category, counterpartyId, amount });
  const names = new Map([
    ["a", "Aziz"],
    ["b", "Bobur"],
    ["c", "Chingiz"],
  ]);

  it("nets loans against repayments per counterparty and hides settled ones", () => {
    const { owedToMe, iOwe } = debtBalances(
      [
        entry("loan_given", "a", 500_000),
        entry("loan_repayment_received", "a", 200_000),
        entry("loan_received", "b", 300_000),
        entry("loan_repayment_paid", "b", 100_000),
        entry("loan_given", "c", 50_000),
        entry("loan_repayment_received", "c", 50_000),
        entry("rent", null, 9_000),
      ],
      names,
    );

    expect(owedToMe).toEqual([{ counterpartyId: "a", counterpartyName: "Aziz", amount: 300_000 }]);
    expect(iOwe).toEqual([{ counterpartyId: "b", counterpartyName: "Bobur", amount: 200_000 }]);
  });
});
