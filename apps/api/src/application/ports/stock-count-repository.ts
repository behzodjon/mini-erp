import type { NewStockCount, StockCount, StockCountLine } from "../../domain/stock-count.js";

/** What a draft owns; the number, status and execution time are not editable. */
export type StockCountContent = Pick<StockCount, "date" | "warehouseId" | "note" | "lines" | "totalValue">;

export interface StockCountRepository {
  create(count: NewStockCount): Promise<StockCount>;
  findById(id: string): Promise<StockCount | null>;
  /** Newest first. */
  list(): Promise<StockCount[]>;
  /** The summed value of the counts executed in [from, until): negative when they found more shortage than surplus. */
  executedValue(range: { from: Date; until: Date }): Promise<number>;
  /** Resolves null when the count does not exist or is no longer a draft. */
  replaceDraft(id: string, content: StockCountContent): Promise<StockCount | null>;
  /** False when the count does not exist or is no longer a draft. */
  deleteDraft(id: string): Promise<boolean>;
  /** The conditional draft → executed flip. Null when it is not a draft any more, so it can only happen once. */
  markExecuted(id: string, lines: StockCountLine[], totalValue: number, executedAt: Date): Promise<StockCount | null>;
}
