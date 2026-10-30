export type StockQuantity = {
  pieces: number;
  blocks: number;
  /** Pieces left over after whole blocks. */
  remainderPieces: number;
};

export type StockLocation = StockQuantity & { warehouseId: string; warehouseName: string };

export type StockByProductRow = StockQuantity & {
  productId: string;
  productName: string;
  piecesPerBlock: number;
  averageCost: number;
  /** pieces × average cost, in so'm. */
  value: number;
  locations: StockLocation[];
};

/** What one warehouse node holds of one product. Products with nothing there are left out. */
export type StockAtNodeRow = { productId: string; pieces: number };
