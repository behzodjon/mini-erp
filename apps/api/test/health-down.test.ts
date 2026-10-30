import { describe, expect, it } from "vitest";
import { buildHttpApp, type HttpDeps } from "../src/http/app.js";

describe("health when the database is down", () => {
  it("answers 503 so the host stops routing to an unhealthy instance", async () => {
    const checkHealth = async () => ({ api: "ok" as const, database: "down" as const });
    const app = await buildHttpApp({ checkHealth, sessionSecret: "test-secret-test-secret-test-secret-1234", secureCookies: false } as unknown as HttpDeps);

    const res = await app.inject({ method: "GET", url: "/api/health" });

    expect(res.statusCode).toBe(503);
    expect(res.json()).toEqual({ api: "ok", database: "down" });
    await app.close();
  });
});
