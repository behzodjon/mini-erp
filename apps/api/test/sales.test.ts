import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { startTestApp, type TestApp } from "./support/test-app.js";

type Json = Record<string, any>;

describe("sales", () => {
  let t: TestApp;
  let cookie: string;

  beforeAll(async () => {
    t = await startTestApp();
    cookie = await t.loginAsOwner();
  });
  afterAll(() => t.stop());

  const call = (method: "GET" | "POST" | "PUT" | "PATCH" | "DELETE", url: string, payload?: object) =>
    t.app.inject({ method, url, headers: { cookie }, payload });

  async function makeProduct(name: string, piecesPerBlock = 12): Promise<Json> {
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
  /** Puts stock on a shelf the real way: an executed purchase. */
  async function stockUp(productId: string, warehouseId: string, quantity: number, unitPrice: number): Promise<void> {
    const created = await call("POST", "/api/purchases", { date: "2026-10-30", lines: [line(productId, warehouseId, quantity, unitPrice)] });
    expect(created.statusCode).toBe(201);
    expect((await call("POST", `/api/purchases/${created.json().id}/execute`)).statusCode).toBe(200);
  }
  async function draft(lines: object[], extra: object = {}): Promise<Json> {
    const res = await call("POST", "/api/sales", { date: "2026-10-30", lines, ...extra });
    expect(res.statusCode, res.body).toBe(201);
    return res.json();
  }
  const execute = (id: string) => call("POST", `/api/sales/${id}/execute`);
  const product = async (id: string): Promise<Json> => (await call("GET", "/api/products")).json<Json[]>().find((p) => p.id === id)!;
  const cashEntries = async (): Promise<Json[]> => (await call("GET", "/api/cash-entries")).json();
  /** On-hand pieces per location for one product, from the stock report. */
  async function locations(productId: string): Promise<Record<string, number>> {
    const rows = (await call("GET", "/api/reports/stock")).json<Json[]>();
    const row = rows.find((r) => r.productId === productId);
    return Object.fromEntries((row?.locations ?? []).map((l: Json) => [l.warehouseId, l.pieces]));
  }

  describe("drafts", () => {
    it("numbers sales SAV-0001, SAV-0002 and shows each line's total with no cost yet", async () => {
      const cola = await makeProduct("Cola sale draft", 12);
      const wh = await makeWarehouse("Sale draft ombor");
      const first = await draft([line(cola.id, wh.id, 2, 60_000, "block")], { defaultWarehouseId: wh.id, note: "Mijoz" });
      const second = await draft([line(cola.id, wh.id, 5, 6_000)]);

      expect(first.number).toMatch(/^SAV-\d{4}$/);
      expect(Number(second.number.slice(4))).toBe(Number(first.number.slice(4)) + 1);
      expect(first).toMatchObject({ status: "draft", executedAt: null, note: "Mijoz", defaultWarehouseId: wh.id, total: 120_000 });
      expect(first.lines[0]).toEqual({
        productId: cola.id,
        warehouseId: wh.id,
        unit: "block",
        quantity: 2,
        unitPrice: 60_000,
        pieces: 24,
        pricePerPiece: 5_000,
        lineTotal: 120_000,
        costPerPiece: null,
      });
    });

    it("edits, lists and deletes a draft; a draft takes no stock and writes no cash", async () => {
      const p = await makeProduct("Cola sale edit");
      const wh = await makeWarehouse("Sale edit ombor");
      await stockUp(p.id, wh.id, 10, 1_000);
      const cashBefore = (await cashEntries()).length;
      const d = await draft([line(p.id, wh.id, 4, 2_000)]);

      const edited = await call("PUT", `/api/sales/${d.id}`, { date: "2026-10-29", lines: [line(p.id, wh.id, 6, 2_500)] });
      expect(edited.statusCode).toBe(200);
      expect(edited.json()).toMatchObject({ number: d.number, date: "2026-10-29", total: 15_000 });
      expect((await call("GET", "/api/sales")).json<Json[]>().find((s) => s.id === d.id)).toMatchObject({ status: "draft", total: 15_000 });

      expect((await locations(p.id))[wh.id]).toBe(10);
      expect((await cashEntries()).length).toBe(cashBefore);

      expect((await call("DELETE", `/api/sales/${d.id}`)).statusCode).toBe(204);
      expect((await call("GET", `/api/sales/${d.id}`)).statusCode).toBe(404);
    });

    it("rejects invalid drafts and unknown references", async () => {
      const p = await makeProduct("Cola sale invalid");
      const wh = await makeWarehouse("Sale invalid ombor");
      const ok = line(p.id, wh.id, 1, 100);
      for (const bad of [
        { date: "2026-10-30", lines: [] },
        { date: "2026-10-30", lines: [{ ...ok, quantity: 0 }] },
        { date: "2026-10-30", lines: [{ ...ok, unitPrice: -1 }] },
        { date: "2026-10-30", lines: [{ ...ok, costPerPiece: 1 }] },
      ]) {
        expect((await call("POST", "/api/sales", bad)).statusCode, JSON.stringify(bad)).toBe(400);
      }
      const unknown = "64b7f0f0f0f0f0f0f0f0f0f0";
      expect((await call("POST", "/api/sales", { date: "2026-10-30", lines: [line(unknown, wh.id, 1, 1)] })).statusCode).toBe(404);
      expect((await call("POST", "/api/sales", { date: "2026-10-30", lines: [line(p.id, unknown, 1, 1)] })).statusCode).toBe(404);
    });
  });

  describe("execution", () => {
    it("reduces stock, records the cost used, keeps the average and creates the linked cash inflow", async () => {
      const cola = await makeProduct("Cola sale run");
      const wh = await makeWarehouse("Sale run ombor");
      await stockUp(cola.id, wh.id, 10, 1_000);
      await stockUp(cola.id, wh.id, 10, 2_000); // average is now 1,500
      const cashBefore = (await cashEntries()).length;

      const sale = await draft([line(cola.id, wh.id, 8, 3_000)]);
      const res = await execute(sale.id);
      expect(res.statusCode, res.body).toBe(200);
      expect(res.json()).toMatchObject({ status: "executed", total: 24_000 });
      expect(res.json().executedAt).toEqual(expect.any(String));
      expect(res.json().lines[0]).toMatchObject({ pieces: 8, costPerPiece: 1_500 });

      expect(await product(cola.id)).toMatchObject({ onHandQuantity: 12, averageCost: 1_500 });
      expect((await locations(cola.id))[wh.id]).toBe(12);

      const entries = await cashEntries();
      expect(entries).toHaveLength(cashBefore + 1);
      expect(entries.find((e) => e.source?.id === sale.id)).toMatchObject({
        direction: "in",
        category: "sale",
        amount: 24_000,
        number: null,
        source: { type: "sale", id: sale.id, number: sale.number },
      });
    });

    it("takes blocks as pieces", async () => {
      const cola = await makeProduct("Cola sale blocks", 12);
      const wh = await makeWarehouse("Sale blocks ombor");
      await stockUp(cola.id, wh.id, 50, 1_000);
      const res = await execute((await draft([line(cola.id, wh.id, 2, 20_000, "block")])).id);
      expect(res.statusCode).toBe(200);
      expect((await locations(cola.id))[wh.id]).toBe(26);
    });

    it("takes one product from two locations and reduces each correctly", async () => {
      const cola = await makeProduct("Cola sale two places");
      const fridge = await makeWarehouse("Muzlatgich sale");
      const shelf = await makeWarehouse("B javon sale");
      await stockUp(cola.id, fridge.id, 60, 1_000);
      await stockUp(cola.id, shelf.id, 20, 1_000);

      const res = await execute((await draft([line(cola.id, fridge.id, 40, 2_000), line(cola.id, shelf.id, 10, 2_000)])).id);
      expect(res.statusCode, res.body).toBe(200);
      expect(await locations(cola.id)).toEqual({ [fridge.id]: 20, [shelf.id]: 10 });
      expect((await product(cola.id)).onHandQuantity).toBe(30);
    });

    it("refuses a shortfall, names the line, and changes nothing", async () => {
      const cola = await makeProduct("Cola sale short");
      const fanta = await makeProduct("Fanta sale short");
      const wh = await makeWarehouse("Sale short ombor");
      await stockUp(cola.id, wh.id, 10, 1_000);
      await stockUp(fanta.id, wh.id, 5, 1_000);
      const cashBefore = (await cashEntries()).length;

      const sale = await draft([line(cola.id, wh.id, 4, 2_000), line(fanta.id, wh.id, 6, 2_000)]);
      const res = await execute(sale.id);
      expect(res.statusCode).toBe(409);
      expect(res.json()).toMatchObject({ code: "INSUFFICIENT_STOCK" });
      expect(res.json().message).toMatch(/line 2/i);
      expect(res.json().shortages).toEqual([{ line: 1, productId: fanta.id, warehouseId: wh.id, requested: 6, available: 5 }]);

      expect(await locations(cola.id)).toEqual({ [wh.id]: 10 });
      expect(await locations(fanta.id)).toEqual({ [wh.id]: 5 });
      expect(await product(cola.id)).toMatchObject({ onHandQuantity: 10 });
      expect((await cashEntries()).length).toBe(cashBefore);
      expect((await call("GET", `/api/sales/${sale.id}`)).json()).toMatchObject({ status: "draft", executedAt: null });
    });

    it("refuses two lines of the same product and location that together exceed stock", async () => {
      const cola = await makeProduct("Cola sale split");
      const wh = await makeWarehouse("Sale split ombor");
      await stockUp(cola.id, wh.id, 10, 1_000);

      const sale = await draft([line(cola.id, wh.id, 6, 2_000), line(cola.id, wh.id, 6, 2_000)]);
      const res = await execute(sale.id);
      expect(res.statusCode).toBe(409);
      expect(res.json().shortages.map((s: Json) => [s.line, s.requested, s.available])).toEqual([
        [0, 12, 10],
        [1, 12, 10],
      ]);
      expect(await locations(cola.id)).toEqual({ [wh.id]: 10 });
    });

    it("refuses selling from a location that holds none of the product", async () => {
      const cola = await makeProduct("Cola sale empty");
      const wh = await makeWarehouse("Sale empty ombor");
      const res = await execute((await draft([line(cola.id, wh.id, 1, 2_000)])).id);
      expect(res.statusCode).toBe(409);
      expect(res.json().shortages[0]).toMatchObject({ requested: 1, available: 0 });
    });

    it("refuses double execution and posts nothing twice", async () => {
      const cola = await makeProduct("Cola sale twice");
      const wh = await makeWarehouse("Sale twice ombor");
      await stockUp(cola.id, wh.id, 10, 1_000);
      const sale = await draft([line(cola.id, wh.id, 3, 2_000)]);
      const cashBefore = (await cashEntries()).length;

      expect((await execute(sale.id)).statusCode).toBe(200);
      const again = await execute(sale.id);
      expect(again.statusCode).toBe(409);
      expect(again.json()).toMatchObject({ code: "ALREADY_EXECUTED" });
      expect((await locations(cola.id))[wh.id]).toBe(7);
      expect((await cashEntries()).length).toBe(cashBefore + 1);
    });

    it("lets only one of two concurrent sales take the last pieces", async () => {
      const cola = await makeProduct("Cola sale race");
      const wh = await makeWarehouse("Sale race ombor");
      await stockUp(cola.id, wh.id, 10, 1_000);
      const a = await draft([line(cola.id, wh.id, 10, 2_000)]);
      const b = await draft([line(cola.id, wh.id, 10, 2_000)]);

      const statuses = (await Promise.all([execute(a.id), execute(b.id)])).map((r) => r.statusCode).sort();
      expect(statuses).toEqual([200, 409]);
      expect((await locations(cola.id))[wh.id] ?? 0).toBe(0);
      expect((await product(cola.id)).onHandQuantity).toBe(0);
    });

    it("makes an executed sale read-only", async () => {
      const cola = await makeProduct("Cola sale frozen");
      const wh = await makeWarehouse("Sale frozen ombor");
      await stockUp(cola.id, wh.id, 10, 1_000);
      const sale = await draft([line(cola.id, wh.id, 3, 2_000)]);
      await execute(sale.id);

      const edit = await call("PUT", `/api/sales/${sale.id}`, { date: "2026-10-30", lines: [line(cola.id, wh.id, 1, 1)] });
      expect(edit.statusCode).toBe(409);
      expect((await call("DELETE", `/api/sales/${sale.id}`)).statusCode).toBe(409);
      expect((await call("GET", `/api/sales/${sale.id}`)).json()).toMatchObject({ status: "executed", total: 6_000 });
      expect((await execute("64b7f0f0f0f0f0f0f0f0f0f0")).statusCode).toBe(404);
    });
  });

  it("requires login", async () => {
    expect((await t.app.inject({ method: "GET", url: "/api/sales" })).statusCode).toBe(401);
  });
});
