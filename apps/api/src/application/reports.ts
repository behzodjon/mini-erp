import type { StockAtNodeRow, StockByProductRow, StockByWarehouseNode, StockProductLine, StockQuantity } from "@erp/shared";
import { splitIntoBlocks } from "../domain/quantity.js";
import type { Warehouse } from "../domain/warehouse.js";
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

    /**
     * The warehouse tree with, per node, its own stock and the roll-up of its subtree.
     * One pass over the balances: each is added to its node and, via the stored ancestor path, to every ancestor.
     */
    async stockByWarehouse(): Promise<StockByWarehouseNode[]> {
      const [products, warehouses, balances] = await Promise.all([
        deps.products.list({ includeArchived: true }),
        deps.warehouses.list(),
        deps.stock.balances(),
      ]);
      const productById = new Map(products.map((p) => [p.id, p]));
      const ancestorsOf = new Map(warehouses.map((w) => [w.id, w.ancestors]));

      const own = new Map<string, Map<string, number>>();
      const rolledUp = new Map<string, Map<string, number>>();
      const add = (totals: Map<string, Map<string, number>>, warehouseId: string, productId: string, pieces: number) => {
        const perProduct = totals.get(warehouseId) ?? new Map<string, number>();
        perProduct.set(productId, (perProduct.get(productId) ?? 0) + pieces);
        totals.set(warehouseId, perProduct);
      };
      for (const b of balances) {
        add(own, b.warehouseId, b.productId, b.quantity);
        for (const id of [b.warehouseId, ...(ancestorsOf.get(b.warehouseId) ?? [])]) add(rolledUp, id, b.productId, b.quantity);
      }

      const lines = (perProduct: Map<string, number> | undefined): StockProductLine[] =>
        [...(perProduct ?? [])]
          .map(([productId, pieces]) => {
            const p = productById.get(productId)!;
            return {
              productId,
              productName: p.name,
              piecesPerBlock: p.piecesPerBlock,
              averageCost: p.averageCost,
              value: pieces * p.averageCost,
              ...quantity(pieces, p.piecesPerBlock),
            };
          })
          .sort((a, b) => a.productName.localeCompare(b.productName));

      const children = new Map<string | null, Warehouse[]>();
      for (const w of warehouses) children.set(w.parentId, [...(children.get(w.parentId) ?? []), w]);
      const branch = (parentId: string | null): StockByWarehouseNode[] =>
        (children.get(parentId) ?? []).map((w) => {
          const total = lines(rolledUp.get(w.id));
          return {
            warehouseId: w.id,
            name: w.name,
            own: lines(own.get(w.id)),
            rolledUp: total,
            totalPieces: total.reduce((sum, l) => sum + l.pieces, 0),
            totalValue: total.reduce((sum, l) => sum + l.value, 0),
            children: branch(w.id),
          };
        });
      return branch(null);
    },

    /** What one node holds of each product, so a count can show it next to the counted quantity. */
    async stockAtNode(warehouseId: string): Promise<StockAtNodeRow[]> {
      const balances = await deps.stock.balances();
      return balances.filter((b) => b.warehouseId === warehouseId).map((b) => ({ productId: b.productId, pieces: b.quantity }));
    },
  };
}
export type ReportUseCases = ReturnType<typeof makeReportUseCases>;
