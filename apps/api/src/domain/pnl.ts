import type { CashCategory, DebtBalance, PnlReport, SalesFigures } from "@erp/shared";
import { debtEffectOf, expenseCategories } from "./cash-category.js";
import type { CashRecord } from "./cash.js";

export type CategoryTotal = { category: CashCategory; total: number };

/**
 * Net profit from the sales figures, the cash totals of the range and the stock count result.
 * Cash totals are read through the category classification: only operating expenses and other income
 * count. Revenue comes from the sales themselves, and loans, owner money and purchases never reach it.
 */
export function composePnl(input: { sales: SalesFigures; cashTotals: CategoryTotal[]; stockCountResult: number }): PnlReport {
  const totalOf = (category: CashCategory) =>
    input.cashTotals.filter((t) => t.category === category).reduce((sum, t) => sum + t.total, 0);

  const expenses = expenseCategories.map((category) => ({ category, amount: totalOf(category) }));
  const totalExpenses = expenses.reduce((sum, e) => sum + e.amount, 0);
  const otherIncome = totalOf("other_income");

  return {
    revenue: input.sales.revenue,
    costOfGoodsSold: input.sales.costOfGoodsSold,
    grossProfit: input.sales.grossProfit,
    expenses,
    totalExpenses,
    stockCountResult: input.stockCountResult,
    otherIncome,
    netProfit: input.sales.grossProfit - totalExpenses + input.stockCountResult + otherIncome,
  };
}

/** Per counterparty: loans given − repayments received, and loans received − repayments paid. Settled balances are left out. */
export function debtBalances(
  records: Pick<CashRecord, "category" | "counterpartyId" | "amount">[],
  counterpartyNames: ReadonlyMap<string, string>,
): { owedToMe: DebtBalance[]; iOwe: DebtBalance[] } {
  const sides = { owedToMe: new Map<string, number>(), iOwe: new Map<string, number>() };

  for (const { category, counterpartyId, amount } of records) {
    const effect = debtEffectOf(category);
    if (!counterpartyId || !effect) continue;
    const balances = sides[effect.side];
    balances.set(counterpartyId, (balances.get(counterpartyId) ?? 0) + effect.sign * amount);
  }

  const rows = (balances: Map<string, number>): DebtBalance[] =>
    [...balances]
      .filter(([, amount]) => amount !== 0)
      .map(([counterpartyId, amount]) => ({ counterpartyId, counterpartyName: counterpartyNames.get(counterpartyId) ?? "?", amount }))
      .sort((a, b) => a.counterpartyName.localeCompare(b.counterpartyName));
  return { owedToMe: rows(sides.owedToMe), iOwe: rows(sides.iOwe) };
}
