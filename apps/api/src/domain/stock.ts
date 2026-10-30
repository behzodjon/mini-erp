/** One row of the append-only stock ledger. Quantity is signed: positive in, negative out. */
export type StockMovement = {
  productId: string;
  warehouseId: string;
  /** Signed whole pieces. */
  quantity: number;
  /** So'm per piece. */
  unitCost: number;
  source: { type: "purchase"; id: string; line: number };
  executedAt: Date;
};

export type StockBalance = { productId: string; warehouseId: string; quantity: number };
