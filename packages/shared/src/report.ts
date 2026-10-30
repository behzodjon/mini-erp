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

/** One product at a warehouse node: what it holds, in pieces and blocks, valued at the product's average cost. */
export type StockProductLine = StockQuantity & {
  productId: string;
  productName: string;
  piecesPerBlock: number;
  averageCost: number;
  /** pieces × average cost, in so'm. */
  value: number;
};

export type StockByWarehouseNode = {
  warehouseId: string;
  name: string;
  /** What this node holds itself. */
  own: StockProductLine[];
  /** What this node and all of its descendants hold, per product. */
  rolledUp: StockProductLine[];
  /** Pieces and value of `rolledUp`. */
  totalPieces: number;
  totalValue: number;
  children: StockByWarehouseNode[];
};
