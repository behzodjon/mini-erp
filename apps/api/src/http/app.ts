import cookie from "@fastify/cookie";
import fastifyStatic from "@fastify/static";
import Fastify, { type FastifyInstance } from "fastify";
import {
  createProductRequestSchema,
  createWarehouseRequestSchema,
  listProductsQuerySchema,
  loginRequestSchema,
  renameWarehouseRequestSchema,
  updateProductRequestSchema,
} from "@erp/shared";
import type { makeCheckHealth } from "../application/check-health.js";
import type { makeLogin } from "../application/login.js";
import type { ProductUseCases } from "../application/products.js";
import type { WarehouseUseCases } from "../application/warehouses.js";
import { NotAuthenticatedError } from "../domain/errors.js";
import { registerErrorHandler } from "./error-handler.js";
import { endSession, readSession, startSession } from "./session.js";

export type HttpDeps = {
  login: ReturnType<typeof makeLogin>;
  checkHealth: ReturnType<typeof makeCheckHealth>;
  products: ProductUseCases;
  warehouses: WarehouseUseCases;
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
