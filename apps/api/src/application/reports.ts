import type { StockByProductRow, StockQuantity } from "@erp/shared";
import { splitIntoBlocks } from "../domain/quantity.js";
import type { ProductRepository } from "./ports/product-repository.js";
import type { StockRepository } from "./ports/stock-repository.js";
import type { WarehouseRepository } from "./ports/warehouse-repository.js";

const quantity = (pieces: number, piecesPerBlock: number): StockQuantity => {
  const split = splitIntoBlocks(pieces, piecesPerBlock);
  return { pieces, blocks: split.blocks, remainderPieces: split.pieces };
};

export function makeReportUseCases(deps: { products: ProductRepository; warehouses: WarehouseRepository; stock: StockRepository }) {
  return {
    /** Every active product, plus archived ones that still hold stock, with where the stock sits. */
    async stockByProduct(): Promise<StockByProductRow[]> {
      const [products, warehouses, balances] = await Promise.all([
        deps.products.list({ includeArchived: true }),
        deps.warehouses.list(),
        deps.stock.balances(),
      ]);
      const warehouseNames = new Map(warehouses.map((w) => [w.id, w.name]));

      return products
        .filter((p) => !p.archived || p.onHandQuantity !== 0)
        .map((p) => ({
          productId: p.id,
          productName: p.name,
          piecesPerBlock: p.piecesPerBlock,
          ...quantity(p.onHandQuantity, p.piecesPerBlock),
          averageCost: p.averageCost,
          value: p.onHandQuantity * p.averageCost,
          locations: balances
            .filter((b) => b.productId === p.id)
            .map((b) => ({
              warehouseId: b.warehouseId,
              warehouseName: warehouseNames.get(b.warehouseId) ?? "?",
              ...quantity(b.quantity, p.piecesPerBlock),
            }))
            .sort((a, b) => a.warehouseName.localeCompare(b.warehouseName)),
        }));
    },
  };
}
export type ReportUseCases = ReturnType<typeof makeReportUseCases>;
