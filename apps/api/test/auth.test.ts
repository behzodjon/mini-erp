import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { OWNER, sessionCookie, startTestApp, type TestApp } from "./support/test-app.js";

describe("owner authentication", () => {
  let t: TestApp;
  beforeAll(async () => {
    t = await startTestApp();
  });
  afterAll(() => t.stop());

  it("logs the owner in and recognises them on the next request", async () => {
    const login = await t.app.inject({ method: "POST", url: "/api/auth/login", payload: OWNER });
    expect(login.statusCode).toBe(200);

    const me = await t.app.inject({ method: "GET", url: "/api/auth/me", headers: { cookie: sessionCookie(login) } });
    expect(me.statusCode).toBe(200);
    expect(me.json()).toEqual({ username: "owner" });
  });

  it("rejects a wrong password or unknown username without starting a session", async () => {
    for (const payload of [
      { username: OWNER.username, password: "wrong" },
      { username: "stranger", password: OWNER.password },
    ]) {
      const res = await t.app.inject({ method: "POST", url: "/api/auth/login", payload });
      expect(res.statusCode).toBe(401);
      expect(res.cookies).toHaveLength(0);
    }
  });

  it("rejects API requests that carry no valid session", async () => {
    for (const url of ["/api/auth/me", "/api/products"]) {
      const anonymous = await t.app.inject({ method: "GET", url });
      expect(anonymous.statusCode, url).toBe(401);

      const forged = await t.app.inject({ method: "GET", url, headers: { cookie: "session=owner.forged" } });
      expect(forged.statusCode, url).toBe(401);
    }
  });

  it("ends the session on logout", async () => {
    const cookie = await t.loginAsOwner();

    const logout = await t.app.inject({ method: "POST", url: "/api/auth/logout", headers: { cookie } });
    expect(logout.statusCode).toBe(204);
    // The browser drops the cookie because the server expires it.
    const cleared = logout.cookies.find((c) => c.name === "session");
    expect(cleared?.value).toBe("");
    expect(cleared?.expires && cleared.expires.getTime() <= Date.now()).toBe(true);
  });

  it("reports API and database health without requiring a session", async () => {
    const res = await t.app.inject({ method: "GET", url: "/api/health" });
    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual({ api: "ok", database: "ok" });
  });

  it("rejects a login request that is missing fields", async () => {
    const res = await t.app.inject({ method: "POST", url: "/api/auth/login", payload: { username: "owner" } });
    expect(res.statusCode).toBe(400);
  });
});
