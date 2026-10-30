import type {
  DateRangeQuery,
  SalesByProductRow,
  SalesFigures,
  SalesReport,
  StockAtNodeRow,
  StockByProductRow,
  StockByWarehouseNode,
  StockProductLine,
  StockQuantity,
} from "@erp/shared";
import { splitIntoBlocks } from "../domain/quantity.js";
import { shopDaysRange } from "../domain/shop-calendar.js";
import type { Warehouse } from "../domain/warehouse.js";
import type { ProductRepository } from "./ports/product-repository.js";
import type { SaleRepository } from "./ports/sale-repository.js";
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

const withProfit = (revenue: number, costOfGoodsSold: number): SalesFigures => ({ revenue, costOfGoodsSold, grossProfit: revenue - costOfGoodsSold });

export function makeReportUseCases(deps: { products: ProductRepository; sales: SaleRepository; warehouses: WarehouseRepository; stock: StockRepository }) {
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

    /**
     * Executed sales whose execution falls on a shop day in the range, both ends included.
     * Cost of goods sold is the average cost each line stored when it was executed.
     */
    async sales({ from, to }: DateRangeQuery): Promise<SalesReport> {
      const { start, end } = shopDaysRange(from, to);
      const [sales, products] = await Promise.all([
        deps.sales.listExecuted({ from: start, until: end }),
        deps.products.list({ includeArchived: true }),
      ]);
      const productById = new Map(products.map((p) => [p.id, p]));

      const perProduct = new Map<string, { pieces: number; revenue: number; cost: number }>();
      const entries = sales.map((sale) => {
        let cost = 0;
        for (const l of sale.lines) {
          const lineCost = l.pieces * l.costPerPiece!;
          cost += lineCost;
          const row = perProduct.get(l.productId) ?? { pieces: 0, revenue: 0, cost: 0 };
          perProduct.set(l.productId, { pieces: row.pieces + l.pieces, revenue: row.revenue + l.lineTotal, cost: row.cost + lineCost });
        }
        return { id: sale.id, number: sale.number, date: sale.date, executedAt: sale.executedAt!, ...withProfit(sale.total, cost) };
      });

      const rows: SalesByProductRow[] = [...perProduct]
        .map(([productId, row]) => {
          const p = productById.get(productId)!;
          return { productId, productName: p.name, piecesPerBlock: p.piecesPerBlock, ...quantity(row.pieces, p.piecesPerBlock), ...withProfit(row.revenue, row.cost) };
        })
        .sort((a, b) => a.productName.localeCompare(b.productName));

      const sum = (pick: (e: SalesFigures) => number) => entries.reduce((total, e) => total + pick(e), 0);
      return {
        summary: { count: entries.length, ...withProfit(sum((e) => e.revenue), sum((e) => e.costOfGoodsSold)) },
        products: rows,
        sales: entries,
      };
    },

    /** What one node holds of each product, so a count can show it next to the counted quantity. */
    async stockAtNode(warehouseId: string): Promise<StockAtNodeRow[]> {
      const balances = await deps.stock.balances();
      return balances.filter((b) => b.warehouseId === warehouseId).map((b) => ({ productId: b.productId, pieces: b.quantity }));
    },
  };
}
export type ReportUseCases = ReturnType<typeof makeReportUseCases>;
