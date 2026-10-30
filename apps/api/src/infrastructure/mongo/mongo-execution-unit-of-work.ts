import type { Db } from "mongodb";
import type { ExecutionUnitOfWork } from "../../application/ports/transaction.js";
import type { MongoTx } from "./mongo-unit-of-work.js";
import type { UnitOfWork } from "../../application/ports/unit-of-work.js";
import { makeMongoCashEntryRepository } from "./mongo-cash-entry-repository.js";
import { makeMongoProductRepository } from "./mongo-product-repository.js";
import { makeMongoPurchaseRepository } from "./mongo-purchase-repository.js";
import { makeMongoSaleRepository } from "./mongo-sale-repository.js";
import { makeMongoStockRepository } from "./mongo-stock-repository.js";

/** Hands each transaction a set of repositories bound to its session, so every write commits together. */
export function makeMongoExecutionUnitOfWork(db: Db, transactions: UnitOfWork<MongoTx>): ExecutionUnitOfWork {
  return {
    run: (work) =>
      transactions.run(({ session }) =>
        work({
          purchases: makeMongoPurchaseRepository(db, session),
          sales: makeMongoSaleRepository(db, session),
          products: makeMongoProductRepository(db, session),
          stock: makeMongoStockRepository(db, session),
          cash: makeMongoCashEntryRepository(db, session),
        }),
      ),
  };
}
