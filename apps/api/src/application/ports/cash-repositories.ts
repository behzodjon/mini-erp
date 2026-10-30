import type { CategoryTotal } from "../../domain/pnl.js";
import type { CashRecord, Counterparty, NewCashRecord, NewCounterparty } from "../../domain/cash.js";

export interface CashEntryRepository {
  create(entry: NewCashRecord): Promise<CashRecord>;
  /** Oldest first: by date, then by order of creation. */
  list(): Promise<CashRecord[]>;
  /** Entry amounts summed per category, for entries dated within the days `from` to `to`, both included. */
  totalsByCategory(range: { from: string; to: string }): Promise<CategoryTotal[]>;
}

export interface CounterpartyRepository {
  create(counterparty: NewCounterparty): Promise<Counterparty>;
  findById(id: string): Promise<Counterparty | null>;
  list(): Promise<Counterparty[]>;
}
