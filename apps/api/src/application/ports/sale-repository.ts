import type { NewSale, Sale, SaleLine } from "../../domain/sale.js";

/** What a draft owns; the number, status and execution time are not editable. */
export type SaleContent = Pick<Sale, "date" | "defaultWarehouseId" | "note" | "lines" | "total">;

export interface SaleRepository {
  create(sale: NewSale): Promise<Sale>;
  findById(id: string): Promise<Sale | null>;
  /** Newest first. */
  list(): Promise<Sale[]>;
  /** Executed sales whose execution time is in [from, until), oldest first. */
  listExecuted(range: { from: Date; until: Date }): Promise<Sale[]>;
  /** Resolves null when the sale does not exist or is no longer a draft. */
  replaceDraft(id: string, content: SaleContent): Promise<Sale | null>;
  /** False when the sale does not exist or is no longer a draft. */
  deleteDraft(id: string): Promise<boolean>;
  /** The conditional draft → executed flip. Null when it is not a draft any more, so it can only happen once. */
  markExecuted(id: string, lines: SaleLine[], total: number, executedAt: Date): Promise<Sale | null>;
}
