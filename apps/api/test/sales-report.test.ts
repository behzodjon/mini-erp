import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { startTestApp, type TestApp } from "./support/test-app.js";

type Json = Record<string, any>;

/** The shop's calendar day (Tashkent), worked out independently of the code under test. */
const shopDay = (offsetDays = 0): string => {
  const now = new Date(Date.now() + offsetDays * 24 * 3600 * 1000);
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Tashkent" }).format(now);
};

describe("sales report", () => {
  let t: TestApp;
  let cookie: string;

  // Every test starts from an empty shop, so report totals are exact.
  beforeEach(async () => {
    t = await startTestApp();
    cookie = await t.loginAsOwner();
  });
  afterEach(() => t.stop());

  const call = (method: "GET" | "POST", url: string, payload?: object) => t.app.inject({ method, url, headers: { cookie }, payload });

  async function makeProduct(name: string, piecesPerBlock: number): Promise<Json> {
    const res = await call("POST", "/api/products", { name, piecesPerBlock, defaultSalePrice: 10_000 });
    expect(res.statusCode).toBe(201);
    return res.json();
  }
  async function makeWarehouse(name: string): Promise<Json> {
    const res = await call("POST", "/api/warehouses", { name });
    expect(res.statusCode).toBe(201);
    return res.json();
  }
  const line = (productId: string, warehouseId: string, quantity: number, unitPrice: number, unit: "piece" | "block" = "piece") => ({
    productId,
    warehouseId,
    unit,
    quantity,
    unitPrice,
  });
  async function buy(productId: string, warehouseId: string, quantity: number, unitPrice: number): Promise<void> {
    const created = await call("POST", "/api/purchases", { date: "2026-10-30", lines: [line(productId, warehouseId, quantity, unitPrice)] });
    expect(created.statusCode).toBe(201);
    expect((await call("POST", `/api/purchases/${created.json().id}/execute`)).statusCode).toBe(200);
  }
  async function draftSale(lines: object[]): Promise<Json> {
    const res = await call("POST", "/api/sales", { date: "2026-10-30", lines });
    expect(res.statusCode, res.body).toBe(201);
    return res.json();
  }
  async function sell(lines: object[]): Promise<Json> {
    const sale = await draftSale(lines);
    const res = await call("POST", `/api/sales/${sale.id}/execute`);
    expect(res.statusCode, res.body).toBe(200);
    return res.json();
  }
  const report = async (from: string, to: string): Promise<Json> => {
    const res = await call("GET", `/api/reports/sales?from=${from}&to=${to}`);
    expect(res.statusCode, res.body).toBe(200);
    return res.json();
  };

  /** Cola (12 per block, cost 1,000 a piece) and Fanta (6 per block, cost 2,000 a piece), 100 and 60 on the shelf. */
  async function stockedShop() {
    const cola = await makeProduct("Cola report", 12);
    const fanta = await makeProduct("Fanta report", 6);
    const wh = await makeWarehouse("Report ombor");
    await buy(cola.id, wh.id, 100, 1_000);
    await buy(fanta.id, wh.id, 60, 2_000);
    return { cola, fanta, wh };
  }

  it("totals executed sales and breaks them down per product", async () => {
    const { cola, fanta, wh } = await stockedShop();
    const first = await sell([line(cola.id, wh.id, 5, 1_500)]); // 7,500 for goods that cost 5,000
    const second = await sell([line(cola.id, wh.id, 1, 15_000, "block"), line(fanta.id, wh.id, 7, 3_000)]); // 15,000 (cost 12,000) + 21,000 (cost 14,000)

    const result = await report(shopDay(), shopDay());

    expect(result.summary).toEqual({ count: 2, revenue: 43_500, costOfGoodsSold: 31_000, grossProfit: 12_500 });

    expect(result.products).toHaveLength(2);
    expect(result.products[0]).toMatchObject({
      productId: cola.id,
      productName: "Cola report",
      pieces: 17,
      blocks: 1,
      remainderPieces: 5,
      revenue: 22_500,
      costOfGoodsSold: 17_000,
      grossProfit: 5_500,
    });
    expect(result.products[1]).toMatchObject({
      productId: fanta.id,
      pieces: 7,
      blocks: 1,
      remainderPieces: 1,
      revenue: 21_000,
      costOfGoodsSold: 14_000,
      grossProfit: 7_000,
    });

    expect(result.sales.map((s: Json) => s.id).sort()).toEqual([first.id, second.id].sort());
    expect(result.sales.find((s: Json) => s.id === second.id)).toMatchObject({
      number: second.number,
      executedOn: shopDay(),
      revenue: 36_000,
      costOfGoodsSold: 26_000,
      grossProfit: 10_000,
    });
  });

  it("leaves out draft sales", async () => {
    const { cola, wh } = await stockedShop();
    await sell([line(cola.id, wh.id, 2, 1_500)]);
    await draftSale([line(cola.id, wh.id, 50, 9_000)]);

    const result = await report(shopDay(), shopDay());

    expect(result.summary).toMatchObject({ count: 1, revenue: 3_000 });
    expect(result.products).toHaveLength(1);
    expect(result.sales).toHaveLength(1);
  });

  it("filters by execution day, inclusive of both ends in the shop's local day", async () => {
    const { cola, wh } = await stockedShop();
    await sell([line(cola.id, wh.id, 2, 1_500)]);

    for (const [from, to] of [
      [shopDay(-3), shopDay(-1)],
      [shopDay(1), shopDay(3)],
    ] as const) {
      const outside = await report(from, to);
      expect(outside.summary).toEqual({ count: 0, revenue: 0, costOfGoodsSold: 0, grossProfit: 0 });
      expect(outside.products).toEqual([]);
      expect(outside.sales).toEqual([]);
    }

    // The same single day on both ends, and a range that merely ends or starts on it, all include the sale.
    for (const [from, to] of [
      [shopDay(), shopDay()],
      [shopDay(-2), shopDay()],
      [shopDay(), shopDay(2)],
    ] as const) {
      expect((await report(from, to)).summary.count).toBe(1);
    }
  });

  it("is not changed by a purchase made after the sale", async () => {
    const { cola, wh } = await stockedShop();
    await sell([line(cola.id, wh.id, 10, 1_500)]); // cost 10 × 1,000

    await buy(cola.id, wh.id, 100, 3_000); // moves the average cost to 2,000

    const result = await report(shopDay(), shopDay());
    expect(result.summary).toEqual({ count: 1, revenue: 15_000, costOfGoodsSold: 10_000, grossProfit: 5_000 });
    expect(result.products[0]).toMatchObject({ costOfGoodsSold: 10_000, grossProfit: 5_000 });
  });

  it("rejects a missing, malformed or reversed range", async () => {
    for (const query of ["", "?from=2026-10-30", "?from=30.10.2026&to=2026-10-30", "?from=2026-10-31&to=2026-10-30"]) {
      const res = await call("GET", `/api/reports/sales${query}`);
      expect(res.statusCode, query).toBe(400);
    }
  });

  it("requires a session", async () => {
    const res = await t.app.inject({ method: "GET", url: `/api/reports/sales?from=${shopDay()}&to=${shopDay()}` });
    expect(res.statusCode).toBe(401);
  });
});
