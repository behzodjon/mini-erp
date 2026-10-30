import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { startTestApp, type TestApp } from "./support/test-app.js";

type Json = Record<string, any>;

describe("stock by warehouse tree report", () => {
  let t: TestApp;
  let cookie: string;

  beforeAll(async () => {
    t = await startTestApp();
    cookie = await t.loginAsOwner();
  });
  afterAll(() => t.stop());

  const call = (method: "GET" | "POST", url: string, payload?: object) => t.app.inject({ method, url, headers: { cookie }, payload });

  async function makeProduct(name: string, piecesPerBlock: number): Promise<Json> {
    const res = await call("POST", "/api/products", { name, piecesPerBlock, defaultSalePrice: 10_000 });
    expect(res.statusCode).toBe(201);
    return res.json();
  }
  async function makeWarehouse(name: string, parentId?: string): Promise<Json> {
    const res = await call("POST", "/api/warehouses", { name, parentId });
    expect(res.statusCode).toBe(201);
    return res.json();
  }
  /** Puts stock on a shelf the real way: an executed purchase. */
  async function stockUp(productId: string, warehouseId: string, quantity: number, unitPrice: number): Promise<void> {
    const created = await call("POST", "/api/purchases", {
      date: "2026-10-30",
      lines: [{ productId, warehouseId, unit: "piece", quantity, unitPrice }],
    });
    expect(created.statusCode).toBe(201);
    expect((await call("POST", `/api/purchases/${created.json().id}/execute`)).statusCode).toBe(200);
  }
  const report = async (): Promise<Json[]> => {
    const res = await call("GET", "/api/reports/stock-by-warehouse");
    expect(res.statusCode).toBe(200);
    return res.json();
  };
  const find = (nodes: Json[], id: string): Json | undefined =>
    nodes.flatMap((n) => [n, ...(n.children.length ? [find(n.children, id)] : [])]).find((n) => n?.warehouseId === id);
  const line = (lines: Json[], productId: string): Json | undefined => lines.find((l) => l.productId === productId);

  it("rolls stock at a parent and at two children of different depths up to every ancestor", async () => {
    const cola = await makeProduct("Cola tree", 12);
    const fanta = await makeProduct("Fanta tree", 6);
    const root = await makeWarehouse("Tree markaz");
    const shelf = await makeWarehouse("Tree javon", root.id);
    const box = await makeWarehouse("Tree quti", shelf.id);
    const side = await makeWarehouse("Tree yon", root.id);

    await stockUp(cola.id, root.id, 5, 1_000); // at the parent
    await stockUp(cola.id, box.id, 30, 1_000); // two levels down
    await stockUp(fanta.id, side.id, 7, 2_000); // one level down, another branch
    await stockUp(cola.id, side.id, 2, 1_000);

    const tree = await report();
    const rootNode = find(tree, root.id)!;
    const shelfNode = find(tree, shelf.id)!;
    const boxNode = find(tree, box.id)!;
    const sideNode = find(tree, side.id)!;

    // Each node lists only what it holds itself.
    expect(rootNode.own.map((l: Json) => [l.productId, l.pieces])).toEqual([[cola.id, 5]]);
    expect(shelfNode.own).toEqual([]);
    expect(line(boxNode.own, cola.id)?.pieces).toBe(30);
    expect(sideNode.own.map((l: Json) => l.pieces).sort()).toEqual([2, 7]);

    // Roll-ups include every descendant.
    expect(line(boxNode.rolledUp, cola.id)?.pieces).toBe(30);
    expect(line(shelfNode.rolledUp, cola.id)?.pieces).toBe(30);
    expect(line(rootNode.rolledUp, cola.id)?.pieces).toBe(37);
    expect(line(rootNode.rolledUp, fanta.id)?.pieces).toBe(7);
    expect(line(sideNode.rolledUp, fanta.id)?.pieces).toBe(7);
    expect(line(shelfNode.rolledUp, fanta.id)).toBeUndefined();

    // Blocks + remainder and value at average cost (cola 1,000/piece, fanta 2,000/piece).
    expect(line(rootNode.rolledUp, cola.id)).toMatchObject({ blocks: 3, remainderPieces: 1, averageCost: 1_000, value: 37_000 });
    expect(line(rootNode.rolledUp, fanta.id)).toMatchObject({ blocks: 1, remainderPieces: 1, value: 14_000 });

    // Node totals cover the whole subtree.
    expect(rootNode).toMatchObject({ totalPieces: 44, totalValue: 51_000 });
    expect(shelfNode).toMatchObject({ totalPieces: 30, totalValue: 30_000 });
    expect(sideNode).toMatchObject({ totalPieces: 9, totalValue: 16_000 });
  });

  it("nests children under their parents and keeps empty nodes with zero totals", async () => {
    const root = await makeWarehouse("Empty tree markaz");
    const child = await makeWarehouse("Empty tree bola", root.id);

    const rootNode = find(await report(), root.id)!;
    expect(rootNode.children.map((c: Json) => c.warehouseId)).toEqual([child.id]);
    for (const node of [rootNode, rootNode.children[0]]) {
      expect(node).toMatchObject({ own: [], rolledUp: [], totalPieces: 0, totalValue: 0 });
    }
  });

  it("requires a session", async () => {
    const res = await t.app.inject({ method: "GET", url: "/api/reports/stock-by-warehouse" });
    expect(res.statusCode).toBe(401);
  });
});
