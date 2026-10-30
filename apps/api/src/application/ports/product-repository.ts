import type { Product, ProductDetails } from "../../domain/product.js";

export type ProductFilter = { search?: string; includeArchived: boolean };

export interface ProductRepository {
  /** New products start with zero average cost, zero stock and not archived. */
  create(details: ProductDetails): Promise<Product>;
  /** Resolves null when no product has this id. */
  findById(id: string): Promise<Product | null>;
  update(id: string, changes: Partial<ProductDetails>): Promise<Product | null>;
  setArchived(id: string, archived: boolean): Promise<Product | null>;
  /** Overwrites the system-maintained figures after stock moves. */
  setStock(id: string, stock: { averageCost: number; onHandQuantity: number }): Promise<void>;
  /** `search` matches name or SKU, case-insensitively and literally. Sorted by name. */
  list(filter: ProductFilter): Promise<Product[]>;
}
