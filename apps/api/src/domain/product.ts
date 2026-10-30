export type Product = {
  readonly id: string;
  name: string;
  sku: string | null;
  piecesPerBlock: number;
  /** So'm per piece. */
  defaultSalePrice: number;
  /** So'm per piece; maintained by purchase execution, never set by the owner. */
  averageCost: number;
  /** Total pieces across all warehouses; maintained by stock movements. */
  onHandQuantity: number;
  archived: boolean;
};

/** The fields the owner types in. */
export type ProductDetails = Pick<Product, "name" | "sku" | "piecesPerBlock" | "defaultSalePrice">;
