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

/** One product's figures for a given number of pieces, valued at its average cost. */
const productLine = (p: { id: string; name: string; piecesPerBlock: number; averageCost: number }, pieces: number): StockProductLine => ({
  productId: p.id,
  productName: p.name,
  piecesPerBlock: p.piecesPerBlock,
  ...quantity(pieces, p.piecesPerBlock),
  averageCost: p.averageCost,
  value: pieces * p.averageCost,
});

/** Pieces per product, per warehouse node. */
type Totals = Map<string, Map<string, number>>;

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
          ...productLine(p, p.onHandQuantity),
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

      const own: Totals = new Map();
      const rolledUp: Totals = new Map();
      const add = (totals: Totals, warehouseId: string, productId: string, pieces: number) => {
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
          .map(([productId, pieces]) => productLine(productById.get(productId)!, pieces))
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
