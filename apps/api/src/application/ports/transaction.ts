import type { CashEntryRepository } from "./cash-repositories.js";
import type { ProductRepository } from "./product-repository.js";
import type { PurchaseRepository } from "./purchase-repository.js";
import type { SaleRepository } from "./sale-repository.js";
import type { StockCountRepository } from "./stock-count-repository.js";
import type { StockRepository } from "./stock-repository.js";
import type { UnitOfWork } from "./unit-of-work.js";

/** The repositories a document execution writes through; all of them join the same transaction. */
export type TransactionalRepositories = {
  purchases: PurchaseRepository;
  sales: SaleRepository;
  products: ProductRepository;
  stockCounts: StockCountRepository;
  stock: StockRepository;
  cash: CashEntryRepository;
};

export type ExecutionUnitOfWork = UnitOfWork<TransactionalRepositories>;
