import { NotFoundError, PiecesPerBlockLockedError } from "../domain/errors.js";
import type { Product, ProductDetails } from "../domain/product.js";
import type { ProductFilter, ProductRepository } from "./ports/product-repository.js";
import type { StockRepository } from "./ports/stock-repository.js";

export function makeProductUseCases(deps: { products: ProductRepository; stock: StockRepository }) {
  const orNotFound = (product: Product | null): Product => {
    if (!product) throw new NotFoundError("Product");
    return product;
  };

  return {
    create: (details: Omit<ProductDetails, "sku"> & { sku?: string | null }) => deps.products.create({ ...details, sku: details.sku ?? null }),
    list: (filter: ProductFilter) => deps.products.list(filter),
    async update(id: string, changes: Partial<ProductDetails>) {
      const current = orNotFound(await deps.products.findById(id));
      // Historical block figures depend on this number, so it is frozen once stock has moved.
      if (changes.piecesPerBlock !== undefined && changes.piecesPerBlock !== current.piecesPerBlock && (await deps.stock.productHasMovements(id))) {
        throw new PiecesPerBlockLockedError();
      }
      return orNotFound(await deps.products.update(id, changes));
    },
    async setArchived(id: string, archived: boolean) {
      return orNotFound(await deps.products.setArchived(id, archived));
    },
  };
}
export type ProductUseCases = ReturnType<typeof makeProductUseCases>;
