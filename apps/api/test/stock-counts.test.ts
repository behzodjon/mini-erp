import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { startTestApp, type TestApp } from "./support/test-app.js";

type Json = Record<string, any>;

describe("stock counts", () => {
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
  const docLine = (productId: string, warehouseId: string, quantity: number, unitPrice: number) => ({
    productId,
    warehouseId,
    unit: "piece",
    quantity,
    unitPrice,
  });
  /** Puts stock on a shelf the real way: an executed purchase. */
  async function stockUp(productId: string, warehouseId: string, quantity: number, unitPrice: number): Promise<void> {
    const created = await call("POST", "/api/purchases", { date: "2026-10-30", lines: [docLine(productId, warehouseId, quantity, unitPrice)] });
    expect(created.statusCode).toBe(201);
    expect((await call("POST", `/api/purchases/${created.json().id}/execute`)).statusCode).toBe(200);
  }
  async function sell(productId: string, warehouseId: string, quantity: number): Promise<void> {
    const created = await call("POST", "/api/sales", { date: "2026-10-30", lines: [docLine(productId, warehouseId, quantity, 5_000)] });
    expect(created.statusCode).toBe(201);
    expect((await call("POST", `/api/sales/${created.json().id}/execute`)).statusCode).toBe(200);
  }
  const countLine = (productId: string, quantity: number, unit: "piece" | "block" = "piece") => ({ productId, unit, quantity });
  async function draft(warehouseId: string, lines: object[], extra: object = {}): Promise<Json> {
    const res = await call("POST", "/api/stock-counts", { date: "2026-10-30", warehouseId, lines, ...extra });
    expect(res.statusCode, res.body).toBe(201);
    return res.json();
  }
  const execute = (id: string) => call("POST", `/api/stock-counts/${id}/execute`);
  const product = async (id: string): Promise<Json> => (await call("GET", "/api/products")).json<Json[]>().find((p) => p.id === id)!;
  const cashEntries = async (): Promise<Json[]> => (await call("GET", "/api/cash-entries")).json();
  /** On-hand pieces per location for one product, from the stock report. */
  async function locations(productId: string): Promise<Record<string, number>> {
    const rows = (await call("GET", "/api/reports/stock")).json<Json[]>();
    const row = rows.find((r) => r.productId === productId);
    return Object.fromEntries((row?.locations ?? []).map((l: Json) => [l.warehouseId, l.pieces]));
  }

  describe("drafts", () => {
    it("numbers counts INV-0001, INV-0002 and keeps the lines as entered, with nothing worked out yet", async () => {
      const cola = await makeProduct("Cola count draft", 12);
      const wh = await makeWarehouse("Count draft ombor");
      const first = await draft(wh.id, [countLine(cola.id, 2, "block")], { note: "Oylik" });
      const second = await draft(wh.id, [countLine(cola.id, 5)]);

      expect(first.number).toMatch(/^INV-\d{4}$/);
      expect(Number(second.number.slice(4))).toBe(Number(first.number.slice(4)) + 1);
      expect(first).toMatchObject({ status: "draft", executedAt: null, note: "Oylik", warehouseId: wh.id, totalValue: null });
      expect(first.lines[0]).toEqual({
        productId: cola.id,
        unit: "block",
        quantity: 2,
        countedPieces: 24,
        systemPieces: null,
        difference: null,
        unitCost: null,
        value: null,
      });
    });

    it("edits, lists and deletes a draft; a draft changes no stock", async () => {
      const p = await makeProduct("Cola count edit");
      const wh = await makeWarehouse("Count edit ombor");
      await stockUp(p.id, wh.id, 10, 1_000);
      const d = await draft(wh.id, [countLine(p.id, 3)]);

      const edited = await call("PUT", `/api/stock-counts/${d.id}`, { date: "2026-10-29", warehouseId: wh.id, lines: [countLine(p.id, 8)] });
      expect(edited.statusCode).toBe(200);
      expect(edited.json()).toMatchObject({ number: d.number, date: "2026-10-29" });
      expect(edited.json().lines[0]).toMatchObject({ quantity: 8, countedPieces: 8 });
      expect((await call("GET", "/api/stock-counts")).json<Json[]>().find((c) => c.id === d.id)).toMatchObject({ status: "draft" });
      expect(await locations(p.id)).toEqual({ [wh.id]: 10 });

      expect((await call("DELETE", `/api/stock-counts/${d.id}`)).statusCode).toBe(204);
      expect((await call("GET", `/api/stock-counts/${d.id}`)).statusCode).toBe(404);
    });

    it("rejects an empty count, a negative quantity and the same product twice with 400", async () => {
      const p = await makeProduct("Cola count invalid");
      const wh = await makeWarehouse("Count invalid ombor");
      const bad = (lines: object[]) => call("POST", "/api/stock-counts", { date: "2026-10-30", warehouseId: wh.id, lines });
      expect((await bad([])).statusCode).toBe(400);
      expect((await bad([countLine(p.id, -1)])).statusCode).toBe(400);
      expect((await bad([countLine(p.id, 1), countLine(p.id, 2, "block")])).statusCode).toBe(400);
    });

    it("answers 404 for an unknown warehouse or product, or an unknown count", async () => {
      const p = await makeProduct("Cola count 404");
      const wh = await makeWarehouse("Count 404 ombor");
      const ghost = "64b7f0f0f0f0f0f0f0f0f0f0";
      const create = (warehouseId: string, productId: string) =>
        call("POST", "/api/stock-counts", { date: "2026-10-30", warehouseId, lines: [countLine(productId, 1)] });
      expect((await create(ghost, p.id)).statusCode).toBe(404);
      expect((await create(wh.id, ghost)).statusCode).toBe(404);
      expect((await call("GET", `/api/stock-counts/${ghost}`)).statusCode).toBe(404);
      expect((await execute(ghost)).statusCode).toBe(404);
    });
  });

  describe("execution", () => {
    it("brings balances to the counted values and records each difference at average cost", async () => {
      const cola = await makeProduct("Cola count run");
      const fanta = await makeProduct("Fanta count run");
      const wh = await makeWarehouse("Count run ombor");
      await stockUp(cola.id, wh.id, 10, 1_500);
      await stockUp(fanta.id, wh.id, 10, 2_000);
      const cashBefore = (await cashEntries()).length;

      const d = await draft(wh.id, [countLine(cola.id, 7), countLine(fanta.id, 14)]);
      const res = await execute(d.id);

      expect(res.statusCode, res.body).toBe(200);
      const done = res.json();
      expect(done).toMatchObject({ status: "executed", number: d.number, totalValue: -4_500 + 8_000 });
      expect(done.executedAt).toEqual(expect.any(String));
      expect(done.lines[0]).toMatchObject({ countedPieces: 7, systemPieces: 10, difference: -3, unitCost: 1_500, value: -4_500 });
      expect(done.lines[1]).toMatchObject({ countedPieces: 14, systemPieces: 10, difference: 4, unitCost: 2_000, value: 8_000 });

      expect(await locations(cola.id)).toEqual({ [wh.id]: 7 });
      expect(await locations(fanta.id)).toEqual({ [wh.id]: 14 });
      expect(await product(cola.id)).toMatchObject({ onHandQuantity: 7, averageCost: 1_500 });
      expect(await product(fanta.id)).toMatchObject({ onHandQuantity: 14, averageCost: 2_000 });
      expect((await cashEntries()).length).toBe(cashBefore);
      expect((await call("GET", `/api/stock-counts/${d.id}`)).json()).toMatchObject({ status: "executed", totalValue: 3_500 });
    });

    it("counts in blocks and writes nothing for a line that already matches", async () => {
      const p = await makeProduct("Cola count blocks", 12);
      const wh = await makeWarehouse("Count blocks ombor");
      await stockUp(p.id, wh.id, 24, 1_000);

      const d = await draft(wh.id, [countLine(p.id, 2, "block")]);
      const res = await execute(d.id);

      expect(res.statusCode, res.body).toBe(200);
      expect(res.json().lines[0]).toMatchObject({ countedPieces: 24, systemPieces: 24, difference: 0, value: 0 });
      expect(res.json().totalValue).toBe(0);
      expect(await locations(p.id)).toEqual({ [wh.id]: 24 });
    });

    it("counts a product with no stock at the node as a surplus, and a counted zero clears the shelf", async () => {
      const fresh = await makeProduct("Cola count fresh");
      const gone = await makeProduct("Cola count gone");
      const wh = await makeWarehouse("Count fresh ombor");
      await stockUp(gone.id, wh.id, 6, 1_000);

      const res = await execute((await draft(wh.id, [countLine(fresh.id, 5), countLine(gone.id, 0)])).id);

      expect(res.statusCode, res.body).toBe(200);
      expect(res.json().lines[0]).toMatchObject({ systemPieces: 0, difference: 5, unitCost: 0, value: 0 });
      expect(res.json().lines[1]).toMatchObject({ systemPieces: 6, difference: -6, value: -6_000 });
      expect(await locations(fresh.id)).toEqual({ [wh.id]: 5 });
      expect(await locations(gone.id)).toEqual({});
      expect(await product(gone.id)).toMatchObject({ onHandQuantity: 0 });
    });

    it("only changes the counted node; stock of the same product elsewhere stays, and on-hand follows the difference", async () => {
      const p = await makeProduct("Cola count nodes");
      const a = await makeWarehouse("Count nodes A");
      const b = await makeWarehouse("Count nodes B");
      await stockUp(p.id, a.id, 10, 1_000);
      await stockUp(p.id, b.id, 4, 1_000);

      await execute((await draft(a.id, [countLine(p.id, 12)])).id);

      expect(await locations(p.id)).toEqual({ [a.id]: 12, [b.id]: 4 });
      expect(await product(p.id)).toMatchObject({ onHandQuantity: 16 });
    });

    it("compares with the stock at execution time: a sale between creating and executing does not distort the result", async () => {
      const p = await makeProduct("Cola count race");
      const wh = await makeWarehouse("Count race ombor");
      await stockUp(p.id, wh.id, 10, 1_000);
      // The owner counts 8 on the shelf while 10 are on the books; two are then sold before the count is executed.
      const d = await draft(wh.id, [countLine(p.id, 8)]);
      await sell(p.id, wh.id, 2);

      const res = await execute(d.id);

      expect(res.statusCode, res.body).toBe(200);
      expect(res.json().lines[0]).toMatchObject({ systemPieces: 8, difference: 0, value: 0 });
      expect(await locations(p.id)).toEqual({ [wh.id]: 8 });
      expect(await product(p.id)).toMatchObject({ onHandQuantity: 8 });
    });

    it("refuses a second execution with 409 and posts nothing twice", async () => {
      const p = await makeProduct("Cola count twice");
      const wh = await makeWarehouse("Count twice ombor");
      await stockUp(p.id, wh.id, 10, 1_000);
      const d = await draft(wh.id, [countLine(p.id, 4)]);
      expect((await execute(d.id)).statusCode).toBe(200);

      const again = await execute(d.id);

      expect(again.statusCode).toBe(409);
      expect(again.json()).toMatchObject({ code: "ALREADY_EXECUTED" });
      expect(await locations(p.id)).toEqual({ [wh.id]: 4 });
      expect(await product(p.id)).toMatchObject({ onHandQuantity: 4 });
    });

    it("runs concurrent executions once: one 200, one 409", async () => {
      const p = await makeProduct("Cola count concurrent");
      const wh = await makeWarehouse("Count concurrent ombor");
      await stockUp(p.id, wh.id, 10, 1_000);
      const d = await draft(wh.id, [countLine(p.id, 3)]);

      const results = await Promise.all([execute(d.id), execute(d.id)]);

      expect(results.map((r) => r.statusCode).sort()).toEqual([200, 409]);
      expect(await locations(p.id)).toEqual({ [wh.id]: 3 });
    });

    it("makes an executed count read-only: edit and delete are refused with 409", async () => {
      const p = await makeProduct("Cola count frozen");
      const wh = await makeWarehouse("Count frozen ombor");
      await stockUp(p.id, wh.id, 10, 1_000);
      const d = await draft(wh.id, [countLine(p.id, 9)]);
      await execute(d.id);

      const put = await call("PUT", `/api/stock-counts/${d.id}`, { date: "2026-10-30", warehouseId: wh.id, lines: [countLine(p.id, 1)] });
      const del = await call("DELETE", `/api/stock-counts/${d.id}`);

      expect(put.statusCode).toBe(409);
      expect(del.statusCode).toBe(409);
      expect((await call("GET", `/api/stock-counts/${d.id}`)).json().lines[0]).toMatchObject({ quantity: 9 });
    });
  });

  describe("system quantities", () => {
    it("lists the stock held at one node, so the form can show it next to the counted quantity", async () => {
      const p = await makeProduct("Cola count at node");
      const wh = await makeWarehouse("Count at node A");
      const other = await makeWarehouse("Count at node B");
      await stockUp(p.id, wh.id, 10, 1_000);
      await stockUp(p.id, other.id, 3, 1_000);

      const res = await call("GET", `/api/reports/stock-at/${wh.id}`);

      expect(res.statusCode).toBe(200);
      expect(res.json<Json[]>().filter((r) => r.productId === p.id)).toEqual([{ productId: p.id, pieces: 10 }]);
    });
  });

  it("requires a session", async () => {
    const res = await t.app.inject({ method: "GET", url: "/api/stock-counts" });
    expect(res.statusCode).toBe(401);
  });
});
