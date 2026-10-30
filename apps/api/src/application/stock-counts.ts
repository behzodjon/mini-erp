import type { SaveStockCountRequest, StockCount, StockCountLine } from "@erp/shared";
import { formatDocumentNumber } from "../domain/document-number.js";
import { AlreadyExecutedError, NotFoundError } from "../domain/errors.js";
import { toPieces } from "../domain/quantity.js";
import { countDifference } from "../domain/stock-count.js";
import type { StockMovement } from "../domain/stock.js";
import { loadProducts } from "./document-lines.js";
import type { ProductRepository } from "./ports/product-repository.js";
import type { SequenceCounter } from "./ports/sequence-counter.js";
import type { StockCountContent, StockCountRepository } from "./ports/stock-count-repository.js";
import type { ExecutionUnitOfWork } from "./ports/transaction.js";
import type { WarehouseRepository } from "./ports/warehouse-repository.js";

const STOCK_COUNT_PREFIX = "INV";

export function makeStockCountUseCases(deps: {
  stockCounts: StockCountRepository;
  products: ProductRepository;
  warehouses: WarehouseRepository;
  sequence: SequenceCounter;
  unitOfWork: ExecutionUnitOfWork;
}) {
  const orNotFound = (count: StockCount | null): StockCount => {
    if (!count) throw new NotFoundError("Stock count");
    return count;
  };

  /** Everything that depends on the system's stock is only known once the count is executed. */
  async function buildContent(request: SaveStockCountRequest): Promise<StockCountContent> {
    if (!(await deps.warehouses.findById(request.warehouseId))) throw new NotFoundError("Warehouse");
    const products = await loadProducts(deps.products, request.lines);
    const lines: StockCountLine[] = request.lines.map((l) => ({
      ...l,
      countedPieces: toPieces(l.unit, l.quantity, products.get(l.productId)!.piecesPerBlock),
      systemPieces: null,
      difference: null,
      unitCost: null,
      value: null,
    }));
    return { date: request.date, warehouseId: request.warehouseId, note: request.note ?? "", lines, totalValue: null };
  }

  /** A write that found no draft: either the count is gone or it was already executed. */
  async function explainMissingDraft(id: string): Promise<never> {
    orNotFound(await deps.stockCounts.findById(id));
    throw new AlreadyExecutedError();
  }

  return {
    async createDraft(request: SaveStockCountRequest): Promise<StockCount> {
      const content = await buildContent(request);
      const number = formatDocumentNumber(STOCK_COUNT_PREFIX, await deps.sequence.next(STOCK_COUNT_PREFIX));
      return deps.stockCounts.create({ ...content, number, status: "draft", executedAt: null });
    },

    async updateDraft(id: string, request: SaveStockCountRequest): Promise<StockCount> {
      const content = await buildContent(request);
      return (await deps.stockCounts.replaceDraft(id, content)) ?? explainMissingDraft(id);
    },

    async deleteDraft(id: string): Promise<void> {
      if (!(await deps.stockCounts.deleteDraft(id))) await explainMissingDraft(id);
    },

    async get(id: string): Promise<StockCount> {
      return orNotFound(await deps.stockCounts.findById(id));
    },

    list: () => deps.stockCounts.list(),

    /** Draft → executed. Adopts the counted quantities, comparing against the stock as it is at this moment. */
    execute(id: string): Promise<StockCount> {
      return deps.unitOfWork.run(async (tx) => {
        const count = orNotFound(await tx.stockCounts.findById(id));
        if (count.status === "executed") throw new AlreadyExecutedError();

        const products = await loadProducts(tx.products, count.lines);
        const balances = await tx.stock.balancesAt(count.lines.map((l) => ({ productId: l.productId, warehouseId: count.warehouseId })));
        const systemPieces = new Map(balances.map((b) => [b.productId, b.quantity]));

        // A count never moves the average; a difference is valued at it.
        const lines: StockCountLine[] = count.lines.map((l) => {
          const unitCost = products.get(l.productId)!.averageCost;
          const system = systemPieces.get(l.productId) ?? 0;
          const { difference, value } = countDifference({ countedPieces: l.countedPieces, systemPieces: system, averageCost: unitCost });
          return { ...l, systemPieces: system, difference, unitCost, value };
        });
        const totalValue = lines.reduce((sum, l) => sum + l.value!, 0);
        const executedAt = new Date();

        const executed = await tx.stockCounts.markExecuted(id, lines, totalValue, executedAt);
        if (!executed) throw new AlreadyExecutedError();

        const movements: StockMovement[] = lines.flatMap((l, index) =>
          l.difference === 0
            ? []
            : [
                {
                  productId: l.productId,
                  warehouseId: count.warehouseId,
                  quantity: l.difference!,
                  unitCost: l.unitCost!,
                  source: { type: "count" as const, id, line: index },
                  executedAt,
                },
              ],
        );
        await tx.stock.post(movements);
        for (const l of lines) {
          if (l.difference === 0) continue;
          const product = products.get(l.productId)!;
          await tx.products.setStock(l.productId, { averageCost: product.averageCost, onHandQuantity: product.onHandQuantity + l.difference! });
        }
        return executed;
      });
    },
  };
}
export type StockCountUseCases = ReturnType<typeof makeStockCountUseCases>;
