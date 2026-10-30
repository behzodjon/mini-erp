import type { DocumentLineRequest, PurchaseLine } from "@erp/shared";
import { normaliseLine } from "../domain/document-line.js";
import { NotFoundError } from "../domain/errors.js";
import type { Product } from "../domain/product.js";
import type { ProductRepository } from "./ports/product-repository.js";
import type { WarehouseRepository } from "./ports/warehouse-repository.js";

/** The products the lines mention, by id. Throws when one of them does not exist. */
export async function loadProducts(products: Pick<ProductRepository, "findById">, lines: readonly { productId: string }[]): Promise<Map<string, Product>> {
  const found = new Map<string, Product>();
  for (const { productId } of lines) {
    if (found.has(productId)) continue;
    const product = await products.findById(productId);
    if (!product) throw new NotFoundError("Product");
    found.set(productId, product);
  }
  return found;
}

/** Normalises lines with each product's current pieces per block. */
export const normaliseLines = (lines: readonly DocumentLineRequest[], products: ReadonlyMap<string, Product>): PurchaseLine[] =>
  lines.map((l) => normaliseLine(l, products.get(l.productId)!.piecesPerBlock));

/** Checks the warehouses and products a draft refers to exist, and builds its lines the way they will be stored. */
export async function resolveDraftLines(
  deps: { products: Pick<ProductRepository, "findById">; warehouses: Pick<WarehouseRepository, "findById"> },
  request: { defaultWarehouseId?: string | null; lines: readonly DocumentLineRequest[] },
): Promise<{ defaultWarehouseId: string | null; lines: PurchaseLine[] }> {
  const defaultWarehouseId = request.defaultWarehouseId || null;
  const warehouseIds = new Set([...request.lines.map((l) => l.warehouseId), ...(defaultWarehouseId ? [defaultWarehouseId] : [])]);
  for (const id of warehouseIds) if (!(await deps.warehouses.findById(id))) throw new NotFoundError("Warehouse");

  const products = await loadProducts(deps.products, request.lines);
  return { defaultWarehouseId, lines: normaliseLines(request.lines, products) };
}
