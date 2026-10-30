import type { Sale, SaleLine, SaveSaleRequest } from "@erp/shared";
import { documentTotal } from "../domain/document-line.js";
import { formatDocumentNumber } from "../domain/document-number.js";
import { AlreadyExecutedError, InsufficientStockError, NotFoundError } from "../domain/errors.js";
import { findShortages } from "../domain/sale.js";
import type { StockMovement } from "../domain/stock.js";
import { loadProducts, normaliseLines, resolveDraftLines } from "./document-lines.js";
import type { ProductRepository } from "./ports/product-repository.js";
import type { SaleContent, SaleRepository } from "./ports/sale-repository.js";
import type { SequenceCounter } from "./ports/sequence-counter.js";
import type { ExecutionUnitOfWork } from "./ports/transaction.js";
import type { WarehouseRepository } from "./ports/warehouse-repository.js";

const SALE_PREFIX = "SAV";

export function makeSaleUseCases(deps: {
  sales: SaleRepository;
  products: ProductRepository;
  warehouses: WarehouseRepository;
  sequence: SequenceCounter;
  unitOfWork: ExecutionUnitOfWork;
}) {
  const orNotFound = (sale: Sale | null): Sale => {
    if (!sale) throw new NotFoundError("Sale");
    return sale;
  };

  /** The cost of goods sold is only known once the sale is executed. */
  const draftLines = (lines: ReturnType<typeof normaliseLines>): SaleLine[] => lines.map((l) => ({ ...l, costPerPiece: null }));

  async function buildContent(request: SaveSaleRequest): Promise<SaleContent> {
    const { defaultWarehouseId, lines } = await resolveDraftLines(deps, request);
    return { date: request.date, defaultWarehouseId, note: request.note ?? "", lines: draftLines(lines), total: documentTotal(lines) };
  }

  /** A write that found no draft: either the sale is gone or it was already executed. */
  async function explainMissingDraft(id: string): Promise<never> {
    orNotFound(await deps.sales.findById(id));
    throw new AlreadyExecutedError();
  }

  return {
    async createDraft(request: SaveSaleRequest): Promise<Sale> {
      const content = await buildContent(request);
      const number = formatDocumentNumber(SALE_PREFIX, await deps.sequence.next(SALE_PREFIX));
      return deps.sales.create({ ...content, number, status: "draft", executedAt: null });
    },

    async updateDraft(id: string, request: SaveSaleRequest): Promise<Sale> {
      const content = await buildContent(request);
      return (await deps.sales.replaceDraft(id, content)) ?? explainMissingDraft(id);
    },

    async deleteDraft(id: string): Promise<void> {
      if (!(await deps.sales.deleteDraft(id))) await explainMissingDraft(id);
    },

    async get(id: string): Promise<Sale> {
      return orNotFound(await deps.sales.findById(id));
    },

    list: () => deps.sales.list(),

    /** Draft → executed. Refused with nothing written when any (product, location) pair is short. */
    execute(id: string): Promise<Sale> {
      return deps.unitOfWork.run(async (tx) => {
        const sale = orNotFound(await tx.sales.findById(id));
        if (sale.status === "executed") throw new AlreadyExecutedError();

        const products = await loadProducts(tx.products, sale.lines);
        const normalised = normaliseLines(sale.lines, products);

        const shortages = findShortages(normalised, await tx.stock.balancesAt(normalised));
        if (shortages.length > 0) throw new InsufficientStockError(shortages);

        // Selling never changes the average; each line just remembers the cost it left the shelf at.
        const lines: SaleLine[] = normalised.map((l) => ({ ...l, costPerPiece: products.get(l.productId)!.averageCost }));
        const total = documentTotal(lines);
        const executedAt = new Date();

        const executed = await tx.sales.markExecuted(id, lines, total, executedAt);
        if (!executed) throw new AlreadyExecutedError();

        const onHand = new Map([...products].map(([productId, p]) => [productId, p.onHandQuantity]));
        const movements: StockMovement[] = lines.map((l, index) => {
          onHand.set(l.productId, onHand.get(l.productId)! - l.pieces);
          return {
            productId: l.productId,
            warehouseId: l.warehouseId,
            quantity: -l.pieces,
            unitCost: l.costPerPiece!,
            source: { type: "sale", id, line: index },
            executedAt,
          };
        });
        await tx.stock.post(movements);
        for (const [productId, onHandQuantity] of onHand) {
          await tx.products.setStock(productId, { averageCost: products.get(productId)!.averageCost, onHandQuantity });
        }

        if (total > 0) {
          await tx.cash.create({
            number: null,
            direction: "in",
            category: "sale",
            amount: total,
            date: sale.date,
            counterpartyId: null,
            note: "",
            source: { type: "sale", id, number: sale.number },
          });
        }
        return executed;
      });
    },
  };
}
export type SaleUseCases = ReturnType<typeof makeSaleUseCases>;
