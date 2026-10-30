import { z } from "zod";

export const cashDirections = ["in", "out"] as const;
export type CashDirection = (typeof cashDirections)[number];

/** Categories the owner can pick by hand. */
export const manualInflowCategories = ["loan_received", "loan_repayment_received", "owner_contribution", "other_income"] as const;
export const manualOutflowCategories = [
  "loan_given",
  "loan_repayment_paid",
  "owner_withdrawal",
  "travel_cost",
  "rent",
  "salary",
  "other_expense",
] as const;
export const manualCashCategories = [...manualInflowCategories, ...manualOutflowCategories] as const;
export type ManualCashCategory = (typeof manualCashCategories)[number];

/** Categories the system writes itself when a sale or purchase is executed. */
export const automaticCashCategories = ["sale", "purchase"] as const;
export type CashCategory = ManualCashCategory | (typeof automaticCashCategories)[number];

const isoDate = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/)
  .refine((s) => !Number.isNaN(Date.parse(s)) && new Date(s).toISOString().startsWith(s), "Not a real calendar date");

export const createCounterpartyRequestSchema = z.strictObject({
  name: z.string().trim().min(1),
  phone: z.string().trim().optional(),
});
export type CreateCounterpartyRequest = z.infer<typeof createCounterpartyRequestSchema>;

export type Counterparty = { id: string; name: string; phone: string | null };

export const createCashEntryRequestSchema = z.strictObject({
  direction: z.enum(cashDirections),
  category: z.enum(manualCashCategories),
  /** Whole so'm. */
  amount: z.number().int().positive(),
  /** Calendar day, YYYY-MM-DD. */
  date: isoDate,
  counterpartyId: z.string().min(1).nullish(),
  note: z.string().trim().optional(),
});
export type CreateCashEntryRequest = z.infer<typeof createCashEntryRequestSchema>;

/** Link from an automatic entry back to the sale or purchase that produced it. */
export type CashSourceDocument = { type: "sale" | "purchase"; id: string; number: string };

export type CashEntry = {
  id: string;
  /** KAS-0001 for manual entries; automatic entries carry their source document instead. */
  number: string | null;
  direction: CashDirection;
  category: CashCategory;
  amount: number;
  date: string;
  counterpartyId: string | null;
  counterpartyName: string | null;
  note: string;
  source: CashSourceDocument | null;
};

/** An entry as the cash list shows it. */
export type CashListRow = CashEntry & {
  /** Cash balance after this entry, in list order. May be negative. */
  balance: number;
};
