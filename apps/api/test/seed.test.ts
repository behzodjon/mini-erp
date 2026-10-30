import bcrypt from "bcryptjs";
import { MongoMemoryReplSet } from "mongodb-memory-server";
import type { StockByWarehouseNode } from "@erp/shared";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { composeUseCases, type UseCases } from "../src/composition-root.js";
import { shopDayOf } from "../src/domain/shop-calendar.js";
import { SeedRefusedError, seedShop } from "../src/seed-shop.js";

let replSet: MongoMemoryReplSet;
const opened: UseCases[] = [];

/** A use-case set over a fresh, empty database. */
async function emptyShop(): Promise<UseCases> {
  const shop = await composeUseCases({
    port: 0,
    mongodbUri: replSet.getUri(),
    mongodbDb: `seed_${opened.length}`,
    ownerUsername: "owner",
    ownerPasswordHash: bcrypt.hashSync("x", 4),
    sessionSecret: "test-secret-test-secret-test-secret-1234",
    secureCookies: false,
  });
  opened.push(shop);
  return shop;
}

const today = () => shopDayOf(new Date());
const maxDepth = (nodes: { children: unknown[] }[]): number =>
  nodes.length === 0 ? 0 : 1 + Math.max(...nodes.map((n) => maxDepth(n.children as { children: unknown[] }[])));

/** How many nodes hold stock themselves, not just through their children. */
const nodesHoldingStock = (nodes: StockByWarehouseNode[]): number =>
  nodes.reduce((count, n) => count + (n.own.length > 0 ? 1 : 0) + nodesHoldingStock(n.children), 0);

beforeAll(async () => {
  replSet = await MongoMemoryReplSet.create({ replSet: { count: 1 } });
}, 120_000);

afterAll(async () => {
  await Promise.all(opened.map((s) => s.close()));
  await replSet.stop();
});

describe("seedShop", () => {
  it("fills an empty shop so that every report has data", async () => {
    const shop = await emptyShop();
    await seedShop(shop);

    const products = await shop.products.list({ includeArchived: false });
    expect(new Set(products.map((p) => p.piecesPerBlock)).size).toBeGreaterThanOrEqual(2);

    expect(maxDepth(await shop.warehouses.tree())).toBeGreaterThanOrEqual(2);

    const stockRows = await shop.reports.stockByProduct();
    expect(stockRows.filter((r) => r.pieces > 0).length).toBeGreaterThanOrEqual(3);
    const tree = await shop.reports.stockByWarehouse();
    expect(nodesHoldingStock(tree)).toBeGreaterThanOrEqual(3);

    const range = { from: `${today().slice(0, 8)}01`, to: today() };
    const sales = await shop.reports.sales(range);
    expect(sales.products.length).toBeGreaterThanOrEqual(3);

    const pnl = await shop.reports.pnl(range);
    expect(pnl.revenue).toBeGreaterThan(0);
    expect(pnl.costOfGoodsSold).toBeGreaterThan(0);
    expect(pnl.totalExpenses).toBeGreaterThan(0);
    expect(pnl.stockCountResult).toBeLessThan(0);
    expect(pnl.netProfit).toBeGreaterThan(0);

    const debts = await shop.reports.cashAndDebts();
    expect(debts.owedToMe.length).toBeGreaterThan(0);
    expect(debts.iOwe.length).toBeGreaterThan(0);
  });

  it("leaves a draft of each document kind", async () => {
    const shop = await emptyShop();
    await seedShop(shop);

    const statuses = (docs: { status: string }[]) => new Set(docs.map((d) => d.status));
    expect(statuses(await shop.purchases.list())).toEqual(new Set(["draft", "executed"]));
    expect(statuses(await shop.sales.list())).toEqual(new Set(["draft", "executed"]));
    expect(statuses(await shop.stockCounts.list())).toEqual(new Set(["draft", "executed"]));
  });

  it("refuses a shop that already has data unless forced", async () => {
    const shop = await emptyShop();
    await seedShop(shop);
    const productsBefore = (await shop.products.list({ includeArchived: true })).length;

    await expect(seedShop(shop)).rejects.toBeInstanceOf(SeedRefusedError);
    expect((await shop.products.list({ includeArchived: true })).length).toBe(productsBefore);

    await seedShop(shop, { force: true });
    expect((await shop.products.list({ includeArchived: true })).length).toBe(productsBefore * 2);
  });
});
