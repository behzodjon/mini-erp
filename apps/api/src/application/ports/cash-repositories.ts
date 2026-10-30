import type { CashRecord, Counterparty, NewCashRecord, NewCounterparty } from "../../domain/cash.js";

export interface CashEntryRepository {
  create(entry: NewCashRecord): Promise<CashRecord>;
  /** Oldest first: by date, then by order of creation. */
  list(): Promise<CashRecord[]>;
}

export interface CounterpartyRepository {
  create(counterparty: NewCounterparty): Promise<Counterparty>;
  findById(id: string): Promise<Counterparty | null>;
  list(): Promise<Counterparty[]>;
}
