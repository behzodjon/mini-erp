import cookie from "@fastify/cookie";
import fastifyStatic from "@fastify/static";
import Fastify, { type FastifyInstance } from "fastify";
import {
  createCashEntryRequestSchema,
  createCounterpartyRequestSchema,
  createProductRequestSchema,
  createWarehouseRequestSchema,
  listProductsQuerySchema,
  loginRequestSchema,
  renameWarehouseRequestSchema,
  savePurchaseRequestSchema,
  saveSaleRequestSchema,
  updateProductRequestSchema,
} from "@erp/shared";
import type { makeCheckHealth } from "../application/check-health.js";
import type { makeLogin } from "../application/login.js";
import type { CashUseCases } from "../application/cash.js";
import type { CounterpartyUseCases } from "../application/counterparties.js";
import type { ProductUseCases } from "../application/products.js";
import type { PurchaseUseCases } from "../application/purchases.js";
import type { ReportUseCases } from "../application/reports.js";
import type { SaleUseCases } from "../application/sales.js";
import type { WarehouseUseCases } from "../application/warehouses.js";
import { NotAuthenticatedError } from "../domain/errors.js";
import { registerErrorHandler } from "./error-handler.js";
import { endSession, readSession, startSession } from "./session.js";

export type HttpDeps = {
  login: ReturnType<typeof makeLogin>;
  checkHealth: ReturnType<typeof makeCheckHealth>;
  products: ProductUseCases;
  warehouses: WarehouseUseCases;
  purchases: PurchaseUseCases;
  sales: SaleUseCases;
  reports: ReportUseCases;
  cash: CashUseCases;
  counterparties: CounterpartyUseCases;
  sessionSecret: string;
  secureCookies: boolean;
  webRoot?: string;
};

declare module "fastify" {
  interface FastifyContextConfig {
    /** Routes opt out of the session requirement explicitly; everything else is protected. */
    public?: boolean;
  }
}

export async function buildHttpApp(deps: HttpDeps): Promise<FastifyInstance> {
  const app = Fastify();
  registerErrorHandler(app);
  await app.register(cookie, { secret: deps.sessionSecret });

  app.addHook("onRequest", async (request) => {
    if (request.routeOptions.config.public) return;
    if (!readSession(request)) throw new NotAuthenticatedError();
  });

  app.post("/api/auth/login", { config: { public: true } }, async (request, reply) => {
    const { username, password } = loginRequestSchema.parse(request.body);
    const owner = await deps.login(username, password);
    startSession(reply, owner, deps.secureCookies);
    return owner;
  });

  app.post("/api/auth/logout", async (_request, reply) => {
    endSession(reply);
    return reply.status(204).send();
  });

  app.get("/api/auth/me", async (request) => readSession(request));

  app.get("/api/products", async (request) => deps.products.list(listProductsQuerySchema.parse(request.query)));

  app.post("/api/products", async (request, reply) => {
    const product = await deps.products.create(createProductRequestSchema.parse(request.body));
    return reply.status(201).send(product);
  });

  app.patch<{ Params: { id: string } }>("/api/products/:id", async (request) =>
    deps.products.update(request.params.id, updateProductRequestSchema.parse(request.body)),
  );

  app.post<{ Params: { id: string } }>("/api/products/:id/archive", async (request) =>
    deps.products.setArchived(request.params.id, true),
  );

  app.post<{ Params: { id: string } }>("/api/products/:id/unarchive", async (request) =>
    deps.products.setArchived(request.params.id, false),
  );

  app.get("/api/warehouses", async () => deps.warehouses.tree());

  app.post("/api/warehouses", async (request, reply) => {
    const warehouse = await deps.warehouses.create(createWarehouseRequestSchema.parse(request.body));
    return reply.status(201).send(warehouse);
  });

  app.patch<{ Params: { id: string } }>("/api/warehouses/:id", async (request) =>
    deps.warehouses.rename(request.params.id, renameWarehouseRequestSchema.parse(request.body).name),
  );

  app.delete<{ Params: { id: string } }>("/api/warehouses/:id", async (request, reply) => {
    await deps.warehouses.remove(request.params.id);
    return reply.status(204).send();
  });

  app.get("/api/counterparties", async () => deps.counterparties.list());

  app.post("/api/counterparties", async (request, reply) => {
    const counterparty = await deps.counterparties.create(createCounterpartyRequestSchema.parse(request.body));
    return reply.status(201).send(counterparty);
  });

  app.get("/api/cash-entries", async () => deps.cash.list());

  app.post("/api/cash-entries", async (request, reply) => {
    const entry = await deps.cash.recordManualEntry(createCashEntryRequestSchema.parse(request.body));
    return reply.status(201).send(entry);
  });

  app.get("/api/purchases", async () => deps.purchases.list());

  app.get<{ Params: { id: string } }>("/api/purchases/:id", async (request) => deps.purchases.get(request.params.id));

  app.post("/api/purchases", async (request, reply) => {
    const purchase = await deps.purchases.createDraft(savePurchaseRequestSchema.parse(request.body));
    return reply.status(201).send(purchase);
  });

  app.put<{ Params: { id: string } }>("/api/purchases/:id", async (request) =>
    deps.purchases.updateDraft(request.params.id, savePurchaseRequestSchema.parse(request.body)),
  );

  app.delete<{ Params: { id: string } }>("/api/purchases/:id", async (request, reply) => {
    await deps.purchases.deleteDraft(request.params.id);
    return reply.status(204).send();
  });

  app.post<{ Params: { id: string } }>("/api/purchases/:id/execute", async (request) => deps.purchases.execute(request.params.id));

  app.get("/api/sales", async () => deps.sales.list());

  app.get<{ Params: { id: string } }>("/api/sales/:id", async (request) => deps.sales.get(request.params.id));

  app.post("/api/sales", async (request, reply) => {
    const sale = await deps.sales.createDraft(saveSaleRequestSchema.parse(request.body));
    return reply.status(201).send(sale);
  });

  app.put<{ Params: { id: string } }>("/api/sales/:id", async (request) =>
    deps.sales.updateDraft(request.params.id, saveSaleRequestSchema.parse(request.body)),
  );

  app.delete<{ Params: { id: string } }>("/api/sales/:id", async (request, reply) => {
    await deps.sales.deleteDraft(request.params.id);
    return reply.status(204).send();
  });

  app.post<{ Params: { id: string } }>("/api/sales/:id/execute", async (request) => deps.sales.execute(request.params.id));

  app.get("/api/reports/stock", async () => deps.reports.stockByProduct());

  app.get("/api/health", { config: { public: true } }, async () => deps.checkHealth());

  if (deps.webRoot) await registerWebApp(app, deps.webRoot);

  return app;
}

/** Serves the built web app; non-API paths that match no file get index.html so client-side routes survive a reload. */
async function registerWebApp(app: FastifyInstance, webRoot: string): Promise<void> {
  await app.register(async (web) => {
    // Scoped to this plugin: only the static routes opt out of the session guard.
    web.addHook("onRoute", (route) => {
      route.config = { ...route.config, public: true };
    });
    await web.register(fastifyStatic, { root: webRoot, wildcard: false });
    // The 404 route is not seen by onRoute, and Fastify's types omit `config` here although the guard reads it at runtime.
    const publicRoute = { config: { public: true } } as unknown as Record<string, never>;
    web.setNotFoundHandler(publicRoute, (request, reply) => {
      if (request.method !== "GET" || request.url.startsWith("/api/")) {
        return reply.status(404).send({ error: "not_found" });
      }
      return reply.sendFile("index.html");
    });
  });
}
