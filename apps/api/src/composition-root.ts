import type { FastifyInstance } from "fastify";
import { MongoClient } from "mongodb";
import { makeCheckHealth } from "./application/check-health.js";
import { makeLogin } from "./application/login.js";
import type { AppConfig } from "./config.js";
import { bcryptPasswordHasher } from "./infrastructure/bcrypt-password-hasher.js";
import { makeMongoDatabaseHealth } from "./infrastructure/mongo/mongo-database-health.js";
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

  const checkHealth = makeCheckHealth({ database: makeMongoDatabaseHealth(mongo.db(config.mongodbDb)) });

  const app = await buildHttpApp({ login, checkHealth, sessionSecret: config.sessionSecret, secureCookies: config.secureCookies, webRoot: config.webRoot });
  app.addHook("onClose", async () => {
    await mongo.close();
  });
  return app;
}
