import type { FastifyInstance } from "fastify";
import { MongoClient } from "mongodb";
import { makePurchaseUseCases } from "./application/purchases.js";
import { makeSaleUseCases } from "./application/sales.js";
import { makeReportUseCases } from "./application/reports.js";
import { makeCashUseCases } from "./application/cash.js";
import { makeCheckHealth } from "./application/check-health.js";
import { makeCounterpartyUseCases } from "./application/counterparties.js";
import { makeLogin } from "./application/login.js";
import { makeProductUseCases } from "./application/products.js";
import { makeWarehouseUseCases } from "./application/warehouses.js";
import type { AppConfig } from "./config.js";
import { bcryptPasswordHasher } from "./infrastructure/bcrypt-password-hasher.js";
import { makeMongoCashEntryRepository } from "./infrastructure/mongo/mongo-cash-entry-repository.js";
import { makeMongoCounterpartyRepository } from "./infrastructure/mongo/mongo-counterparty-repository.js";
import { makeMongoDatabaseHealth } from "./infrastructure/mongo/mongo-database-health.js";
import { makeMongoProductRepository } from "./infrastructure/mongo/mongo-product-repository.js";
import { makeMongoSequenceCounter } from "./infrastructure/mongo/mongo-sequence-counter.js";
import { makeMongoWarehouseRepository } from "./infrastructure/mongo/mongo-warehouse-repository.js";
import { makeMongoPurchaseRepository } from "./infrastructure/mongo/mongo-purchase-repository.js";
import { makeMongoSaleRepository } from "./infrastructure/mongo/mongo-sale-repository.js";
import { makeMongoExecutionUnitOfWork } from "./infrastructure/mongo/mongo-execution-unit-of-work.js";
import { makeMongoStockRepository, ensureStockIndexes } from "./infrastructure/mongo/mongo-stock-repository.js";
import { makeMongoUnitOfWork } from "./infrastructure/mongo/mongo-unit-of-work.js";
import { buildHttpApp } from "./http/app.js";

export type App = FastifyInstance;

/** The only place where concrete adapters are chosen and wired to use cases. */
export async function createApp(config: AppConfig): Promise<App> {
  const mongo = new MongoClient(config.mongodbUri);
  await mongo.connect();

  const login = makeLogin({
    owner: { username: config.ownerUsername, passwordHash: config.ownerPasswordHash },
    hasher: bcryptPasswordHasher,
  });

  const db = mongo.db(config.mongodbDb);
  await ensureStockIndexes(db);
  const checkHealth = makeCheckHealth({ database: makeMongoDatabaseHealth(db) });

  const productRepository = makeMongoProductRepository(db);
  const warehouseRepository = makeMongoWarehouseRepository(db);
  const stockRepository = makeMongoStockRepository(db);
  const sequence = makeMongoSequenceCounter(db);

  const products = makeProductUseCases({ products: productRepository, stock: stockRepository });
  const warehouses = makeWarehouseUseCases({ warehouses: warehouseRepository, stock: stockRepository });
  const executionUnitOfWork = makeMongoExecutionUnitOfWork(db, makeMongoUnitOfWork(mongo));
  const purchases = makePurchaseUseCases({
    purchases: makeMongoPurchaseRepository(db),
    products: productRepository,
    warehouses: warehouseRepository,
    sequence,
    unitOfWork: executionUnitOfWork,
  });
  const sales = makeSaleUseCases({
    sales: makeMongoSaleRepository(db),
    products: productRepository,
    warehouses: warehouseRepository,
    sequence,
    unitOfWork: executionUnitOfWork,
  });
  const reports = makeReportUseCases({ products: productRepository, warehouses: warehouseRepository, stock: stockRepository });

  const counterpartyRepository = makeMongoCounterpartyRepository(db);
  const counterparties = makeCounterpartyUseCases({ counterparties: counterpartyRepository });
  const cash = makeCashUseCases({
    cash: makeMongoCashEntryRepository(db),
    counterparties: counterpartyRepository,
    sequence,
  });

  const app = await buildHttpApp({ login, checkHealth, products, warehouses, purchases, sales, reports, cash, counterparties, sessionSecret: config.sessionSecret, secureCookies: config.secureCookies, webRoot: config.webRoot });
  app.addHook("onClose", async () => {
    await mongo.close();
  });
  return app;
}
