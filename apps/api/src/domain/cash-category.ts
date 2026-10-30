import type { CashCategory, CashDirection } from "@erp/shared";

/** Where a category lands in the P&L. "none" means balance-sheet only: it moves cash but is not profit or loss. */
export type PnlEffect = "revenue" | "other_income" | "operating_expense" | "none";

type CategoryRule = { direction: CashDirection; pnl: PnlEffect; needsCounterparty: boolean };

/** The one place that says what each category means; reports and validation both read it. */
const RULES: Record<CashCategory, CategoryRule> = {
  sale: { direction: "in", pnl: "revenue", needsCounterparty: false },
  purchase: { direction: "out", pnl: "none", needsCounterparty: false },
  loan_received: { direction: "in", pnl: "none", needsCounterparty: true },
  loan_repayment_received: { direction: "in", pnl: "none", needsCounterparty: true },
  loan_given: { direction: "out", pnl: "none", needsCounterparty: true },
  loan_repayment_paid: { direction: "out", pnl: "none", needsCounterparty: true },
  owner_contribution: { direction: "in", pnl: "none", needsCounterparty: false },
  owner_withdrawal: { direction: "out", pnl: "none", needsCounterparty: false },
  other_income: { direction: "in", pnl: "other_income", needsCounterparty: false },
  travel_cost: { direction: "out", pnl: "operating_expense", needsCounterparty: false },
  rent: { direction: "out", pnl: "operating_expense", needsCounterparty: false },
  salary: { direction: "out", pnl: "operating_expense", needsCounterparty: false },
  other_expense: { direction: "out", pnl: "operating_expense", needsCounterparty: false },
};

export const pnlEffectOf = (category: CashCategory): PnlEffect => RULES[category].pnl;
export const directionOf = (category: CashCategory): CashDirection => RULES[category].direction;
export const requiresCounterparty = (category: CashCategory): boolean => RULES[category].needsCounterparty;
