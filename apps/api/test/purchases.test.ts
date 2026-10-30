import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { startTestApp, type TestApp } from "./support/test-app.js";

type Json = Record<string, any>;

describe("purchases and stock by product", () => {
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
  async function makeWarehouse(name: string, parentId?: string): Promise<Json> {
    const res = await call("POST", "/api/warehouses", { name, parentId });
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
  async function draft(lines: object[], extra: object = {}): Promise<Json> {
    const res = await call("POST", "/api/purchases", { date: "2026-10-30", lines, ...extra });
    expect(res.statusCode, res.body).toBe(201);
    return res.json();
  }
  const execute = (id: string) => call("POST", `/api/purchases/${id}/execute`);
  const product = async (id: string): Promise<Json> => {
    const all = (await call("GET", "/api/products")).json<Json[]>();
    return all.find((p) => p.id === id)!;
  };
  const stockReport = async (): Promise<Json[]> => (await call("GET", "/api/reports/stock")).json();
  const cashEntries = async (): Promise<Json[]> => (await call("GET", "/api/cash-entries")).json();

  describe("drafts", () => {
    it("numbers purchases XAR-0001, XAR-0002 and stores both the entered and the normalised line", async () => {
      const cola = await makeProduct("Cola draft", 12);
      const wh = await makeWarehouse("Draft ombor");
      const first = await draft([line(cola.id, wh.id, 3, 60_000, "block")], { defaultWarehouseId: wh.id, note: "Birinchi" });
      const second = await draft([line(cola.id, wh.id, 5, 6_000)]);

      expect(first.number).toMatch(/^XAR-\d{4}$/);
      expect(Number(second.number.slice(4))).toBe(Number(first.number.slice(4)) + 1);
      expect(first).toMatchObject({ status: "draft", executedAt: null, openingBalance: false, note: "Birinchi", defaultWarehouseId: wh.id, total: 180_000 });
      expect(first.lines[0]).toEqual({
        productId: cola.id,
        warehouseId: wh.id,
        unit: "block",
        quantity: 3,
        unitPrice: 60_000,
        pieces: 36,
        pricePerPiece: 5_000,
        lineTotal: 180_000,
      });
      // a draft changes nothing yet
      expect((await product(cola.id)).onHandQuantity).toBe(0);
    });

    it("edits and deletes a draft", async () => {
      const p = await makeProduct("Cola edit");
      const wh = await makeWarehouse("Edit ombor");
      const d = await draft([line(p.id, wh.id, 10, 1_000)]);

      const edited = await call("PUT", `/api/purchases/${d.id}`, {
        date: "2026-10-29",
        openingBalance: true,
        lines: [line(p.id, wh.id, 20, 1_500)],
      });
      expect(edited.statusCode).toBe(200);
      expect(edited.json()).toMatchObject({ number: d.number, date: "2026-10-29", openingBalance: true, total: 30_000 });

      expect((await call("GET", `/api/purchases/${d.id}`)).json()).toMatchObject({ total: 30_000 });
      expect((await call("DELETE", `/api/purchases/${d.id}`)).statusCode).toBe(204);
      expect((await call("GET", `/api/purchases/${d.id}`)).statusCode).toBe(404);
    });

    it("lists purchases with status, date and total", async () => {
      const p = await makeProduct("Cola list");
      const wh = await makeWarehouse("List ombor");
      const d = await draft([line(p.id, wh.id, 2, 500)]);
      const rows = (await call("GET", "/api/purchases")).json<Json[]>();
      expect(rows.find((r) => r.id === d.id)).toMatchObject({ number: d.number, status: "draft", date: "2026-10-30", total: 1_000 });
    });

    it("rejects invalid drafts and unknown references", async () => {
      const p = await makeProduct("Cola invalid");
      const wh = await makeWarehouse("Invalid ombor");
      const ok = line(p.id, wh.id, 1, 100);
      for (const bad of [
        { date: "2026-10-30", lines: [] },
        { date: "30.10.2026", lines: [ok] },
        { date: "2026-10-30", lines: [{ ...ok, quantity: 0 }] },
        { date: "2026-10-30", lines: [{ ...ok, quantity: 1.5 }] },
        { date: "2026-10-30", lines: [{ ...ok, unitPrice: -1 }] },
        { date: "2026-10-30", lines: [{ ...ok, unit: "box" }] },
        { date: "2026-10-30", lines: [{ ...ok, lineTotal: 1 }] },
      ]) {
        expect((await call("POST", "/api/purchases", bad)).statusCode, JSON.stringify(bad)).toBe(400);
      }
      const unknown = "64b7f0f0f0f0f0f0f0f0f0f0";
      expect((await call("POST", "/api/purchases", { date: "2026-10-30", lines: [line(unknown, wh.id, 1, 1)] })).statusCode).toBe(404);
      expect((await call("POST", "/api/purchases", { date: "2026-10-30", lines: [line(p.id, unknown, 1, 1)] })).statusCode).toBe(404);
      expect((await call("POST", "/api/purchases", { date: "2026-10-30", defaultWarehouseId: unknown, lines: [ok] })).statusCode).toBe(404);
    });
  });

  describe("execution", () => {
    it("an opening-balance purchase adds stock and sets the average cost but records no cash outflow", async () => {
      const p = await makeProduct("Cola opening");
      const wh = await makeWarehouse("Opening ombor");
      const cashBefore = (await cashEntries()).length;
      const d = await draft([line(p.id, wh.id, 100, 5_000)], { openingBalance: true });

      const res = await execute(d.id);
      expect(res.statusCode, res.body).toBe(200);
      expect(res.json()).toMatchObject({ status: "executed", openingBalance: true });
      expect(res.json().executedAt).toEqual(expect.any(String));

      expect(await product(p.id)).toMatchObject({ onHandQuantity: 100, averageCost: 5_000 });
      expect(await cashEntries()).toHaveLength(cashBefore);
    });

    it("a second purchase at another price blends the average cost and records a linked cash outflow", async () => {
      const p = await makeProduct("Cola blend");
      const wh = await makeWarehouse("Blend ombor");
      await execute((await draft([line(p.id, wh.id, 100, 5_000)], { openingBalance: true })).id);

      const second = await draft([line(p.id, wh.id, 100, 7_000)], { date: "2026-10-31" });
      expect((await execute(second.id)).statusCode).toBe(200);

      expect(await product(p.id)).toMatchObject({ onHandQuantity: 200, averageCost: 6_000 });
      const outflow = (await cashEntries()).find((e) => e.source?.id === second.id)!;
      expect(outflow).toMatchObject({
        direction: "out",
        category: "purchase",
        amount: 700_000,
        date: "2026-10-31",
        number: null,
        source: { type: "purchase", id: second.id, number: second.number },
      });
    });

    it("a line entered in blocks shows in pieces and as blocks + pieces", async () => {
      const p = await makeProduct("Cola blocks", 12);
      const wh = await makeWarehouse("Blocks ombor");
      // 2 blocks at 120 000 per block = 24 pieces at 10 000, plus 6 loose pieces
      await execute((await draft([line(p.id, wh.id, 2, 120_000, "block"), line(p.id, wh.id, 6, 10_000)])).id);

      const row = (await stockReport()).find((r) => r.productId === p.id)!;
      expect(row).toMatchObject({ pieces: 30, blocks: 2, remainderPieces: 6, piecesPerBlock: 12, averageCost: 10_000, value: 300_000 });
      expect(row.locations).toEqual([{ warehouseId: wh.id, warehouseName: "Blocks ombor", pieces: 30, blocks: 2, remainderPieces: 6 }]);
    });

    it("splits one product across locations and lists each location in the report", async () => {
      const p = await makeProduct("Cola places");
      const main = await makeWarehouse("Places asosiy");
      const shelf = await makeWarehouse("Places javon", main.id);
      await execute((await draft([line(p.id, main.id, 10, 1_000), line(p.id, shelf.id, 5, 1_000)])).id);

      const row = (await stockReport()).find((r) => r.productId === p.id)!;
      expect(row.pieces).toBe(15);
      expect(row.locations.map((l: Json) => [l.warehouseName, l.pieces]).sort()).toEqual([
        ["Places asosiy", 10],
        ["Places javon", 5],
      ]);
    });

    it("refuses to execute twice and posts nothing the second time", async () => {
      const p = await makeProduct("Cola twice");
      const wh = await makeWarehouse("Twice ombor");
      const d = await draft([line(p.id, wh.id, 10, 1_000)]);
      const cashBefore = (await cashEntries()).length;

      expect((await execute(d.id)).statusCode).toBe(200);
      const again = await execute(d.id);
      expect(again.statusCode).toBe(409);
      expect(again.json().code).toBe("ALREADY_EXECUTED");

      expect((await product(p.id)).onHandQuantity).toBe(10);
      expect(await cashEntries()).toHaveLength(cashBefore + 1);
    });

    it("applies a purchase once when execution is requested concurrently", async () => {
      const p = await makeProduct("Cola race");
      const wh = await makeWarehouse("Race ombor");
      const d = await draft([line(p.id, wh.id, 10, 1_000)]);

      const results = await Promise.all([execute(d.id), execute(d.id), execute(d.id)]);
      expect(results.map((r) => r.statusCode).sort()).toEqual([200, 409, 409]);
      expect((await product(p.id)).onHandQuantity).toBe(10);
    });

    it("executes different purchases of the same product concurrently without losing either", async () => {
      const p = await makeProduct("Cola shared");
      const wh = await makeWarehouse("Shared ombor");
      const drafts = await Promise.all([1, 2, 3].map(() => draft([line(p.id, wh.id, 10, 1_000)])));

      const results = await Promise.all(drafts.map((d) => execute(d.id)));
      expect(results.map((r) => r.statusCode)).toEqual([200, 200, 200]);
      expect(await product(p.id)).toMatchObject({ onHandQuantity: 30, averageCost: 1_000 });
      const row = (await stockReport()).find((r) => r.productId === p.id)!;
      expect(row.locations[0].pieces).toBe(30);
    });

    it("refuses to edit or delete an executed purchase", async () => {
      const p = await makeProduct("Cola frozen");
      const wh = await makeWarehouse("Frozen ombor");
      const d = await draft([line(p.id, wh.id, 10, 1_000)]);
      await execute(d.id);

      const edit = await call("PUT", `/api/purchases/${d.id}`, { date: "2026-10-30", lines: [line(p.id, wh.id, 99, 1)] });
      expect(edit.statusCode).toBe(409);
      expect((await call("DELETE", `/api/purchases/${d.id}`)).statusCode).toBe(409);
      expect((await call("GET", `/api/purchases/${d.id}`)).json()).toMatchObject({ status: "executed", total: 10_000 });
    });

    it("executing an unknown purchase is not found", async () => {
      expect((await execute("64b7f0f0f0f0f0f0f0f0f0f0")).statusCode).toBe(404);
      expect((await execute("not-an-id")).statusCode).toBe(404);
    });
  });

  describe("guards that stock movement switches on", () => {
    it("locks pieces per block once the product has stock movements", async () => {
      const p = await makeProduct("Cola lock", 12);
      const wh = await makeWarehouse("Lock ombor");

      // no movements yet: the change is allowed
      expect((await call("PATCH", `/api/products/${p.id}`, { piecesPerBlock: 10 })).statusCode).toBe(200);

      await execute((await draft([line(p.id, wh.id, 10, 1_000)])).id);

      const refused = await call("PATCH", `/api/products/${p.id}`, { piecesPerBlock: 24 });
      expect(refused.statusCode).toBe(409);
      expect(refused.json().code).toBe("PIECES_PER_BLOCK_LOCKED");
      expect((await product(p.id)).piecesPerBlock).toBe(10);

      // other fields and an unchanged value stay editable
      expect((await call("PATCH", `/api/products/${p.id}`, { name: "Cola lock 2", piecesPerBlock: 10 })).statusCode).toBe(200);
    });

    it("refuses to delete a warehouse that holds stock", async () => {
      const p = await makeProduct("Cola held");
      const holding = await makeWarehouse("Holding ombor");
      const empty = await makeWarehouse("Empty ombor");
      await execute((await draft([line(p.id, holding.id, 10, 1_000)])).id);

      const refused = await call("DELETE", `/api/warehouses/${holding.id}`);
      expect(refused.statusCode).toBe(409);
      expect(refused.json().code).toBe("WAREHOUSE_HAS_STOCK");
      expect((await call("DELETE", `/api/warehouses/${empty.id}`)).statusCode).toBe(204);
    });
  });

  it("requires a session", async () => {
    for (const [method, url] of [
      ["GET", "/api/purchases"],
      ["POST", "/api/purchases"],
      ["POST", "/api/purchases/abc/execute"],
      ["GET", "/api/reports/stock"],
    ] as const) {
      expect((await t.app.inject({ method, url })).statusCode, `${method} ${url}`).toBe(401);
    }
  });
});
