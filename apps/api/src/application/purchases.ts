import type { Purchase, SavePurchaseRequest } from "@erp/shared";
import { nextAverageCost } from "../domain/average-cost.js";
import { formatDocumentNumber } from "../domain/document-number.js";
import { AlreadyExecutedError, NotFoundError } from "../domain/errors.js";
import { documentTotal } from "../domain/document-line.js";
import type { StockMovement } from "../domain/stock.js";
import { loadProducts, normaliseLines, resolveDraftLines } from "./document-lines.js";
import type { ProductRepository } from "./ports/product-repository.js";
import type { PurchaseContent, PurchaseRepository } from "./ports/purchase-repository.js";
import type { SequenceCounter } from "./ports/sequence-counter.js";
import type { ExecutionUnitOfWork } from "./ports/transaction.js";
import type { WarehouseRepository } from "./ports/warehouse-repository.js";

const PURCHASE_PREFIX = "XAR";

export function makePurchaseUseCases(deps: {
  purchases: PurchaseRepository;
  products: ProductRepository;
  warehouses: WarehouseRepository;
  sequence: SequenceCounter;
  unitOfWork: ExecutionUnitOfWork;
}) {
  const orNotFound = (purchase: Purchase | null): Purchase => {
    if (!purchase) throw new NotFoundError("Purchase");
    return purchase;
  };

  async function buildContent(request: SavePurchaseRequest): Promise<PurchaseContent> {
    const { defaultWarehouseId, lines } = await resolveDraftLines(deps, request);
    return {
      date: request.date,
      defaultWarehouseId,
      openingBalance: request.openingBalance ?? false,
      note: request.note ?? "",
      lines,
      total: documentTotal(lines),
    };
  }

  /** A write that found no draft: either the purchase is gone or it was already executed. */
  async function explainMissingDraft(id: string): Promise<never> {
    orNotFound(await deps.purchases.findById(id));
    throw new AlreadyExecutedError();
  }

  return {
    async createDraft(request: SavePurchaseRequest): Promise<Purchase> {
      const content = await buildContent(request);
      const number = formatDocumentNumber(PURCHASE_PREFIX, await deps.sequence.next(PURCHASE_PREFIX));
      return deps.purchases.create({ ...content, number, status: "draft", executedAt: null });
    },

    async updateDraft(id: string, request: SavePurchaseRequest): Promise<Purchase> {
      const content = await buildContent(request);
      return (await deps.purchases.replaceDraft(id, content)) ?? explainMissingDraft(id);
    },

    async deleteDraft(id: string): Promise<void> {
      if (!(await deps.purchases.deleteDraft(id))) await explainMissingDraft(id);
    },

    async get(id: string): Promise<Purchase> {
      return orNotFound(await deps.purchases.findById(id));
    },

    list: () => deps.purchases.list(),

    /** Draft → executed, with stock, average cost and cash all committed together or not at all. */
    execute(id: string): Promise<Purchase> {
      return deps.unitOfWork.run(async (tx) => {
        const purchase = orNotFound(await tx.purchases.findById(id));
        if (purchase.status === "executed") throw new AlreadyExecutedError();

        const products = await loadProducts(tx.products, purchase.lines);

        // Pieces per block may have been edited since the draft was saved, so the lines are normalised again.
        const lines = normaliseLines(purchase.lines, products);
        const total = documentTotal(lines);
        const executedAt = new Date();

        const executed = await tx.purchases.markExecuted(id, lines, total, executedAt);
        if (!executed) throw new AlreadyExecutedError();

        const movements: StockMovement[] = [];
        const stock = new Map(
          [...products].map(([productId, p]) => [productId, { averageCost: p.averageCost, onHandQuantity: p.onHandQuantity }]),
        );
        lines.forEach((l, index) => {
          const current = stock.get(l.productId)!;
          current.averageCost = nextAverageCost({
            onHandQuantity: current.onHandQuantity,
            averageCost: current.averageCost,
            purchasedPieces: l.pieces,
            purchaseTotal: l.lineTotal,
          });
          current.onHandQuantity += l.pieces;
          movements.push({
            productId: l.productId,
            warehouseId: l.warehouseId,
            quantity: l.pieces,
            unitCost: l.pricePerPiece,
            source: { type: "purchase", id, line: index },
            executedAt,
          });
        });
        await tx.stock.post(movements);
        for (const [productId, figures] of stock) await tx.products.setStock(productId, figures);

        // Opening stock was already paid for before day one; a free delivery moves no money.
        if (!purchase.openingBalance && total > 0) {
          await tx.cash.create({
            number: null,
            direction: "out",
            category: "purchase",
            amount: total,
            date: purchase.date,
            counterpartyId: null,
            note: "",
            source: { type: "purchase", id, number: purchase.number },
          });
        }
        return executed;
      });
    },
  };
}
export type PurchaseUseCases = ReturnType<typeof makePurchaseUseCases>;
