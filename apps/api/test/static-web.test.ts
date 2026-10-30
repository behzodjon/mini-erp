import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { startTestApp, type TestApp } from "./support/test-app.js";

describe("serving the built web app", () => {
  let t: TestApp;
  let webRoot: string;

  beforeAll(async () => {
    webRoot = mkdtempSync(join(tmpdir(), "erp-web-"));
    writeFileSync(join(webRoot, "index.html"), "<!doctype html><title>erp-index</title>");
    mkdirSync(join(webRoot, "assets"));
    writeFileSync(join(webRoot, "assets", "app.js"), "console.log('app')");
    t = await startTestApp({ webRoot });
  });
  afterAll(async () => {
    await t.stop();
    rmSync(webRoot, { recursive: true, force: true });
  });

  it("serves the index page at the root without a session", async () => {
    const res = await t.app.inject({ method: "GET", url: "/" });
    expect(res.statusCode).toBe(200);
    expect(res.body).toContain("erp-index");
  });

  it("serves built assets", async () => {
    const res = await t.app.inject({ method: "GET", url: "/assets/app.js" });
    expect(res.statusCode).toBe(200);
    expect(res.body).toContain("console.log");
  });

  it("falls back to the index page for client-side routes, so reload works", async () => {
    const res = await t.app.inject({ method: "GET", url: "/mahsulotlar" });
    expect(res.statusCode).toBe(200);
    expect(res.body).toContain("erp-index");
  });

  it("keeps unknown API paths as JSON 404s, not the index page", async () => {
    const res = await t.app.inject({ method: "GET", url: "/api/nope" });
    expect(res.statusCode).toBe(404);
    expect(res.body).not.toContain("erp-index");
  });

  it("still protects API routes", async () => {
    const res = await t.app.inject({ method: "GET", url: "/api/auth/me" });
    expect(res.statusCode).toBe(401);
  });
});
