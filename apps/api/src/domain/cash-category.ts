import type { CashCategory, CashDirection, ExpenseCategory } from "@erp/shared";

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

/** Operating expense categories, in the order the rules list them. */
export const expenseCategories = (Object.keys(RULES) as CashCategory[]).filter((c) => RULES[c].pnl === "operating_expense") as ExpenseCategory[];

/** Which running debt a category moves: "owedToMe" or "iOwe", up (+1) or down (-1). Null for categories that are no debt. */
export type DebtEffect = { side: "owedToMe" | "iOwe"; sign: 1 | -1 };
const DEBT_EFFECTS: Record<CashCategory, DebtEffect | null> = {
  sale: null,
  purchase: null,
  loan_given: { side: "owedToMe", sign: 1 },
  loan_repayment_received: { side: "owedToMe", sign: -1 },
  loan_received: { side: "iOwe", sign: 1 },
  loan_repayment_paid: { side: "iOwe", sign: -1 },
  owner_contribution: null,
  owner_withdrawal: null,
  other_income: null,
  travel_cost: null,
  rent: null,
  salary: null,
  other_expense: null,
};

export const pnlEffectOf = (category: CashCategory): PnlEffect => RULES[category].pnl;
export const debtEffectOf = (category: CashCategory): DebtEffect | null => DEBT_EFFECTS[category];
export const directionOf = (category: CashCategory): CashDirection => RULES[category].direction;
export const requiresCounterparty = (category: CashCategory): boolean => RULES[category].needsCounterparty;
