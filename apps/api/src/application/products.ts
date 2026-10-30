import { NotFoundError } from "../domain/errors.js";
import type { Product, ProductDetails } from "../domain/product.js";
import type { ProductRepository } from "./ports/product-repository.js";

export function makeProductUseCases(deps: { products: ProductRepository }) {
  const orNotFound = (product: Product | null): Product => {
    if (!product) throw new NotFoundError("Product");
    return product;
  };

  return {
    create: (details: Omit<ProductDetails, "sku"> & { sku?: string | null }) => deps.products.create({ ...details, sku: details.sku ?? null }),
    list: (filter: { search?: string; includeArchived: boolean }) => deps.products.list(filter),
    async update(id: string, changes: Partial<ProductDetails>) {
      return orNotFound(await deps.products.update(id, changes));
    },
    async setArchived(id: string, archived: boolean) {
      return orNotFound(await deps.products.setArchived(id, archived));
    },
  };
}
export type ProductUseCases = ReturnType<typeof makeProductUseCases>;
