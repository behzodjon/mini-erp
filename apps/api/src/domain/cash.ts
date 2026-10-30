import type { CashCategory, CashDirection, CashSourceDocument } from "@erp/shared";

/** A money movement. Manual entries have a KAS- number; automatic ones point at their source document instead. */
export type CashRecord = {
  id: string;
  number: string | null;
  direction: CashDirection;
  category: CashCategory;
  amount: number;
  date: string;
  counterpartyId: string | null;
  note: string;
  source: CashSourceDocument | null;
};

export type NewCashRecord = Omit<CashRecord, "id">;

/** Inflows add to the cash balance, outflows subtract. */
export const signedAmount = (record: Pick<CashRecord, "direction" | "amount">): number =>
  record.direction === "in" ? record.amount : -record.amount;

/** The cash on hand: all inflows minus all outflows. May be negative. */
export const cashBalance = (records: Pick<CashRecord, "direction" | "amount">[]): number => records.reduce((sum, r) => sum + signedAmount(r), 0);

export type Counterparty = { id: string; name: string; phone: string | null };
export type NewCounterparty = Omit<Counterparty, "id">;
