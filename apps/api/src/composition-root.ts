import type { FastifyInstance } from "fastify";
import { MongoClient } from "mongodb";
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
  const checkHealth = makeCheckHealth({ database: makeMongoDatabaseHealth(db) });
  const products = makeProductUseCases({ products: makeMongoProductRepository(db) });

  const warehouses = makeWarehouseUseCases({ warehouses: makeMongoWarehouseRepository(db) });

  const counterpartyRepository = makeMongoCounterpartyRepository(db);
  const counterparties = makeCounterpartyUseCases({ counterparties: counterpartyRepository });
  const cash = makeCashUseCases({
    cash: makeMongoCashEntryRepository(db),
    counterparties: counterpartyRepository,
    sequence: makeMongoSequenceCounter(db),
  });

  const app = await buildHttpApp({ login, checkHealth, products, warehouses, cash, counterparties, sessionSecret: config.sessionSecret, secureCookies: config.secureCookies, webRoot: config.webRoot });
  app.addHook("onClose", async () => {
    await mongo.close();
  });
  return app;
}
