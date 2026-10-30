import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { startTestApp, type TestApp } from "./support/test-app.js";

type Json = Record<string, any>;

/** The shop's calendar day (Tashkent), worked out independently of the code under test. */
const shopDay = (offsetDays = 0): string => {
  const now = new Date(Date.now() + offsetDays * 24 * 3600 * 1000);
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Tashkent" }).format(now);
};

describe("P&L and cash & debts reports", () => {
  let t: TestApp;
  let cookie: string;

  // Every test starts from an empty shop, so report totals are exact.
  beforeEach(async () => {
    t = await startTestApp();
    cookie = await t.loginAsOwner();
  });
  afterEach(() => t.stop());

  const call = (method: "GET" | "POST", url: string, payload?: object) => t.app.inject({ method, url, headers: { cookie }, payload });
  const post = async (url: string, payload?: object): Promise<Json> => {
    const res = await call("POST", url, payload);
    expect(res.statusCode, res.body).toBeLessThan(300);
    return res.json();
  };

  const cashEntry = (direction: "in" | "out", category: string, amount: number, extra: object = {}) =>
    post("/api/cash-entries", { direction, category, amount, date: shopDay(), ...extra });
  const counterparty = (name: string): Promise<Json> => post("/api/counterparties", { name });

  const pieceLine = (productId: string, warehouseId: string, quantity: number, unitPrice: number) => ({ productId, warehouseId, unit: "piece", quantity, unitPrice });

  /** 100 Cola bought at 1,000 a piece into one warehouse (cash out 100,000). */
  async function stockedShop() {
    const cola = await post("/api/products", { name: "Cola pnl", piecesPerBlock: 12, defaultSalePrice: 1_500 });
    const wh = await post("/api/warehouses", { name: "Pnl ombor" });
    const purchase = await post("/api/purchases", { date: "2026-10-30", lines: [pieceLine(cola.id, wh.id, 100, 1_000)] });
    await post(`/api/purchases/${purchase.id}/execute`);
    return { cola, wh };
  }
  async function sell(productId: string, warehouseId: string, quantity: number, unitPrice: number) {
    const sale = await post("/api/sales", { date: "2026-10-30", lines: [pieceLine(productId, warehouseId, quantity, unitPrice)] });
    await post(`/api/sales/${sale.id}/execute`);
  }
  async function count(productId: string, warehouseId: string, counted: number) {
    const draft = await post("/api/stock-counts", {
      date: "2026-10-30",
      warehouseId,
      lines: [{ productId, unit: "piece", quantity: counted }],
    });
    await post(`/api/stock-counts/${draft.id}/execute`);
  }

  const pnl = async (from = shopDay(), to = shopDay()): Promise<Json> => {
    const res = await call("GET", `/api/reports/pnl?from=${from}&to=${to}`);
    expect(res.statusCode, res.body).toBe(200);
    return res.json();
  };
  const cashAndDebts = async (): Promise<Json> => {
    const res = await call("GET", "/api/reports/cash-and-debts");
    expect(res.statusCode, res.body).toBe(200);
    return res.json();
  };

  /** Opening cash 1,000,000; buy 100 at 1,000; sell 40 at 1,500; travel 5,000; count finds 55 where 60 are expected. */
  async function fullScenario() {
    await cashEntry("in", "owner_contribution", 1_000_000);
    const { cola, wh } = await stockedShop();
    await sell(cola.id, wh.id, 40, 1_500); // revenue 60,000, cost 40,000
    await cashEntry("out", "travel_cost", 5_000);
    await count(cola.id, wh.id, 55); // 5 short at cost 1,000
    return { cola, wh };
  }

  it("composes net profit from sales, expenses and the count result", async () => {
    await fullScenario();

    expect(await pnl()).toEqual({
      revenue: 60_000,
      costOfGoodsSold: 40_000,
      grossProfit: 20_000,
      expenses: [
        { category: "travel_cost", amount: 5_000 },
        { category: "rent", amount: 0 },
        { category: "salary", amount: 0 },
        { category: "other_expense", amount: 0 },
      ],
      totalExpenses: 5_000,
      stockCountResult: -5_000,
      otherIncome: 0,
      netProfit: 10_000, // 20,000 − 5,000 − 5,000
    });
  });

  it("adds other income and a count surplus, and the purchase cost is not an expense", async () => {
    const { cola, wh } = await stockedShop();
    await cashEntry("in", "other_income", 7_000);
    await count(cola.id, wh.id, 102); // 2 over at cost 1,000

    const result = await pnl();
    expect(result).toMatchObject({ revenue: 0, totalExpenses: 0, otherIncome: 7_000, stockCountResult: 2_000, netProfit: 9_000 });
  });

  it("is not changed by loans, repayments or owner money, which only move cash and debts", async () => {
    await fullScenario();
    const aziz = await counterparty("Aziz");
    const bobur = await counterparty("Bobur");
    const before = await pnl();
    const cashBefore = (await cashAndDebts()).cashBalance;
    expect(cashBefore).toBe(955_000); // 1,000,000 − 100,000 + 60,000 − 5,000

    await cashEntry("out", "loan_given", 300_000, { counterpartyId: aziz.id });
    await cashEntry("in", "loan_repayment_received", 100_000, { counterpartyId: aziz.id });
    await cashEntry("in", "loan_received", 500_000, { counterpartyId: bobur.id });
    await cashEntry("out", "loan_repayment_paid", 150_000, { counterpartyId: bobur.id });
    await cashEntry("in", "owner_contribution", 40_000);
    await cashEntry("out", "owner_withdrawal", 25_000);

    expect(await pnl()).toEqual(before);
    expect(await cashAndDebts()).toEqual({
      cashBalance: 955_000 - 300_000 + 100_000 + 500_000 - 150_000 + 40_000 - 25_000,
      owedToMe: [{ counterpartyId: aziz.id, counterpartyName: "Aziz", amount: 200_000 }],
      iOwe: [{ counterpartyId: bobur.id, counterpartyName: "Bobur", amount: 350_000 }],
    });
  });

  it("hides counterparties whose balance is settled", async () => {
    const aziz = await counterparty("Aziz");
    await cashEntry("out", "loan_given", 100_000, { counterpartyId: aziz.id });
    await cashEntry("in", "loan_repayment_received", 100_000, { counterpartyId: aziz.id });

    expect(await cashAndDebts()).toEqual({ cashBalance: 0, owedToMe: [], iOwe: [] });
  });

  it("leaves out whatever falls outside the date range", async () => {
    await fullScenario();
    await cashEntry("out", "rent", 20_000, { date: shopDay(-10) });
    await cashEntry("in", "other_income", 3_000, { date: shopDay(5) });

    // Today's range: the old rent and the future income are out.
    expect(await pnl(shopDay(-3), shopDay(3))).toMatchObject({ totalExpenses: 5_000, otherIncome: 0, netProfit: 10_000 });
    // A range that holds only those two entries sees neither the sale nor the count.
    expect(await pnl(shopDay(-10), shopDay(-10))).toMatchObject({ revenue: 0, costOfGoodsSold: 0, stockCountResult: 0, totalExpenses: 20_000, netProfit: -20_000 });
    expect(await pnl(shopDay(1), shopDay(2))).toEqual(await pnl(shopDay(-30), shopDay(-20)));
  });

  it("rejects a missing, malformed or reversed range", async () => {
    for (const query of ["", "?from=2026-10-30", "?from=30.10.2026&to=2026-10-30", "?from=2026-10-31&to=2026-10-30"]) {
      expect((await call("GET", `/api/reports/pnl${query}`)).statusCode, query).toBe(400);
    }
  });

  it("requires a session", async () => {
    expect((await t.app.inject({ method: "GET", url: `/api/reports/pnl?from=${shopDay()}&to=${shopDay()}` })).statusCode).toBe(401);
    expect((await t.app.inject({ method: "GET", url: "/api/reports/cash-and-debts" })).statusCode).toBe(401);
  });
});
