import cookie from "@fastify/cookie";
import Fastify, { type FastifyInstance } from "fastify";
import { loginRequestSchema } from "@erp/shared";
import type { makeCheckHealth } from "../application/check-health.js";
import type { makeLogin } from "../application/login.js";
import { NotAuthenticatedError } from "../domain/errors.js";
import { registerErrorHandler } from "./error-handler.js";
import { endSession, readSession, startSession } from "./session.js";

export type HttpDeps = {
  login: ReturnType<typeof makeLogin>;
  checkHealth: ReturnType<typeof makeCheckHealth>;
  sessionSecret: string;
  secureCookies: boolean;
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

  app.get("/api/health", { config: { public: true } }, async () => deps.checkHealth());

  return app;
}
