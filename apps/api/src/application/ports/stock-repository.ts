import type { StockBalance, StockMovement } from "../../domain/stock.js";

export interface StockRepository {
  /** Appends the movements to the ledger and applies them to the cached balances. */
  post(movements: StockMovement[]): Promise<void>;
  productHasMovements(productId: string): Promise<boolean>;
  /** True when the warehouse holds a non-zero quantity of any product. */
  warehouseHoldsStock(warehouseId: string): Promise<boolean>;
  /** The balances of just these (product, location) pairs; pairs that hold nothing may be left out. */
  balancesAt(pairs: readonly { productId: string; warehouseId: string }[]): Promise<StockBalance[]>;
  /** Every non-zero balance. */
  balances(): Promise<StockBalance[]>;
}
