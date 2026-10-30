import type {
  DateRangeQuery,
  SalesByProductRow,
  SalesFigures,
  SalesReport,
  SalesReportEntry,
  StockAtNodeRow,
  StockByProductRow,
  StockByWarehouseNode,
  StockProductLine,
  StockQuantity,
} from "@erp/shared";
import { splitIntoBlocks } from "../domain/quantity.js";
import { asExecuted, type ExecutedSale } from "../domain/sale.js";
import { shopDayOf, shopDaysRange } from "../domain/shop-calendar.js";
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

type ProductFigures = { pieces: number; revenue: number; costOfGoodsSold: number };

/**
 * One pass over the executed sales: each line adds to its sale's entry and to its product's row.
 * Revenue is the sum of line totals and cost is pieces × the cost stored on the line, so the summary,
 * the product rows and the sales list all come from the same numbers.
 */
function salesReport(sales: ExecutedSale[], products: { id: string; name: string; piecesPerBlock: number }[]): SalesReport {
  const productById = new Map(products.map((p) => [p.id, p]));
  const perProduct = new Map<string, ProductFigures>();
  const entries: SalesReportEntry[] = [];

  for (const sale of sales) {
    let revenue = 0;
    let costOfGoodsSold = 0;
    for (const l of sale.lines) {
      const lineCost = l.pieces * l.costPerPiece;
      revenue += l.lineTotal;
      costOfGoodsSold += lineCost;
      const row = perProduct.get(l.productId) ?? { pieces: 0, revenue: 0, costOfGoodsSold: 0 };
      perProduct.set(l.productId, {
        pieces: row.pieces + l.pieces,
        revenue: row.revenue + l.lineTotal,
        costOfGoodsSold: row.costOfGoodsSold + lineCost,
      });
    }
    entries.push({
      id: sale.id,
      number: sale.number,
      date: sale.date,
      executedOn: shopDayOf(new Date(sale.executedAt)),
      ...withProfit(revenue, costOfGoodsSold),
    });
  }

  const rows: SalesByProductRow[] = [...perProduct]
    .map(([productId, row]) => {
      const p = productById.get(productId)!;
      return { productId, productName: p.name, piecesPerBlock: p.piecesPerBlock, ...quantity(row.pieces, p.piecesPerBlock), ...withProfit(row.revenue, row.costOfGoodsSold) };
    })
    .sort((x, y) => x.productName.localeCompare(y.productName));

  const total = (pick: (e: SalesFigures) => number) => entries.reduce((sum, e) => sum + pick(e), 0);
  return {
    summary: { count: entries.length, ...withProfit(total((e) => e.revenue), total((e) => e.costOfGoodsSold)) },
    products: rows,
    sales: entries,
  };
}

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
      return salesReport(sales.map(asExecuted), products);
    },

    /** What one node holds of each product, so a count can show it next to the counted quantity. */
    async stockAtNode(warehouseId: string): Promise<StockAtNodeRow[]> {
      const balances = await deps.stock.balances();
      return balances.filter((b) => b.warehouseId === warehouseId).map((b) => ({ productId: b.productId, pieces: b.quantity }));
    },
  };
}
export type ReportUseCases = ReturnType<typeof makeReportUseCases>;
