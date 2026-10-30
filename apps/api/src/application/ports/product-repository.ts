import type { Product, ProductDetails } from "../../domain/product.js";

export interface ProductRepository {
  /** New products start with zero average cost, zero stock and not archived. */
  create(details: ProductDetails): Promise<Product>;
  /** Resolves null when no product has this id. */
  update(id: string, changes: Partial<ProductDetails>): Promise<Product | null>;
  setArchived(id: string, archived: boolean): Promise<Product | null>;
  /** `search` matches name or SKU, case-insensitively and literally. Sorted by name. */
  list(filter: { search?: string; includeArchived: boolean }): Promise<Product[]>;
}
