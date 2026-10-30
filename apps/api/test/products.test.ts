import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { startTestApp, type TestApp } from "./support/test-app.js";

describe("product catalogue", () => {
  let t: TestApp;
  let cookie: string;

  beforeAll(async () => {
    t = await startTestApp();
    cookie = await t.loginAsOwner();
  });
  afterAll(() => t.stop());

  const create = (payload: object) => t.app.inject({ method: "POST", url: "/api/products", headers: { cookie }, payload });
  const list = (query = "") => t.app.inject({ method: "GET", url: `/api/products${query}`, headers: { cookie } });
  const names = async (query = "") => (await list(query)).json<{ name: string }[]>().map((p) => p.name);

  it("creates a product with zero average cost and zero stock", async () => {
    const res = await create({ name: "Cola 1L", sku: "4780001", piecesPerBlock: 12, defaultSalePrice: 9000 });
    expect(res.statusCode).toBe(201);
    expect(res.json()).toMatchObject({
      name: "Cola 1L",
      sku: "4780001",
      piecesPerBlock: 12,
      defaultSalePrice: 9000,
      averageCost: 0,
      onHandQuantity: 0,
      archived: false,
    });
  });

  it("allows a product without an SKU", async () => {
    const res = await create({ name: "Suv 0.5L", piecesPerBlock: 20, defaultSalePrice: 2000 });
    expect(res.statusCode).toBe(201);
    expect(res.json().sku).toBeNull();
  });

  it("rejects invalid input", async () => {
    const valid = { name: "X", piecesPerBlock: 6, defaultSalePrice: 1000 };
    for (const bad of [
      { ...valid, piecesPerBlock: 0 },
      { ...valid, piecesPerBlock: -3 },
      { ...valid, piecesPerBlock: 1.5 },
      { ...valid, name: "" },
      { ...valid, name: "   " },
      { piecesPerBlock: 6, defaultSalePrice: 1000 },
      { ...valid, defaultSalePrice: -1 },
      { ...valid, defaultSalePrice: 99.5 },
    ]) {
      const res = await create(bad);
      expect(res.statusCode, JSON.stringify(bad)).toBe(400);
    }
  });

  it("rejects an attempt to set average cost or on-hand quantity", async () => {
    const valid = { name: "Sneaky", piecesPerBlock: 6, defaultSalePrice: 1000 };
    for (const extra of [{ averageCost: 500 }, { onHandQuantity: 50 }]) {
      expect((await create({ ...valid, ...extra })).statusCode).toBe(400);
    }

    const { id } = (await create(valid)).json<{ id: string }>();
    const patch = await t.app.inject({ method: "PATCH", url: `/api/products/${id}`, headers: { cookie }, payload: { averageCost: 500 } });
    expect(patch.statusCode).toBe(400);
    const stored = (await list()).json<{ id: string; averageCost: number }[]>().find((p) => p.id === id);
    expect(stored?.averageCost).toBe(0);
  });

  it("edits name, SKU, default sale price and pieces per block", async () => {
    const { id } = (await create({ name: "Fanta", piecesPerBlock: 12, defaultSalePrice: 8000 })).json<{ id: string }>();

    const res = await t.app.inject({
      method: "PATCH",
      url: `/api/products/${id}`,
      headers: { cookie },
      payload: { name: "Fanta 1L", sku: "FAN-1", piecesPerBlock: 6, defaultSalePrice: 8500 },
    });
    expect(res.statusCode).toBe(200);
    expect(res.json()).toMatchObject({ id, name: "Fanta 1L", sku: "FAN-1", piecesPerBlock: 6, defaultSalePrice: 8500 });
  });

  it("validates edits and reports unknown products", async () => {
    const { id } = (await create({ name: "Sprite", piecesPerBlock: 12, defaultSalePrice: 8000 })).json<{ id: string }>();
    const patch = (url: string, payload: object) => t.app.inject({ method: "PATCH", url, headers: { cookie }, payload });

    expect((await patch(`/api/products/${id}`, { piecesPerBlock: 0 })).statusCode).toBe(400);
    expect((await patch(`/api/products/${id}`, { name: "" })).statusCode).toBe(400);
    expect((await patch("/api/products/64b7f0f0f0f0f0f0f0f0f0f0", { name: "Ghost" })).statusCode).toBe(404);
    expect((await patch("/api/products/not-an-id", { name: "Ghost" })).statusCode).toBe(404);
  });

  it("hides archived products from the default list and shows them on request", async () => {
    const { id } = (await create({ name: "Pepsi Archived", piecesPerBlock: 12, defaultSalePrice: 8000 })).json<{ id: string }>();

    const archived = await t.app.inject({ method: "POST", url: `/api/products/${id}/archive`, headers: { cookie } });
    expect(archived.statusCode).toBe(200);
    expect(archived.json().archived).toBe(true);

    expect(await names()).not.toContain("Pepsi Archived");
    expect(await names("?includeArchived=true")).toContain("Pepsi Archived");

    const restored = await t.app.inject({ method: "POST", url: `/api/products/${id}/unarchive`, headers: { cookie } });
    expect(restored.json().archived).toBe(false);
    expect(await names()).toContain("Pepsi Archived");
  });

  it("searches by name or SKU, ignoring case and regex characters", async () => {
    await create({ name: "Limonad Bahor", sku: "LIM-77", piecesPerBlock: 6, defaultSalePrice: 3000 });
    await create({ name: "Sok (olma)", sku: "JUICE.1", piecesPerBlock: 6, defaultSalePrice: 5000 });

    expect(await names("?search=limonad")).toEqual(["Limonad Bahor"]);
    expect(await names("?search=lim-77")).toEqual(["Limonad Bahor"]);
    expect(await names("?search=(olma)")).toEqual(["Sok (olma)"]);
    expect(await names("?search=JUICE.1")).toEqual(["Sok (olma)"]);
    expect(await names("?search=.*")).toEqual([]);
  });

  it("requires a session", async () => {
    const res = await t.app.inject({ method: "POST", url: "/api/products", payload: { name: "A", piecesPerBlock: 1, defaultSalePrice: 0 } });
    expect(res.statusCode).toBe(401);
  });
});
