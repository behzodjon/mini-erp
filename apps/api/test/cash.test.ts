import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { startTestApp, type TestApp } from "./support/test-app.js";

type Entry = { id: string; number: string | null; direction: string; category: string; amount: number; balance: number; date: string; counterpartyName: string | null };

describe("cash register", () => {
  let t: TestApp;
  let cookie: string;

  beforeAll(async () => {
    t = await startTestApp();
    cookie = await t.loginAsOwner();
  });
  afterAll(() => t.stop());

  const post = (url: string, payload: object) => t.app.inject({ method: "POST", url, headers: { cookie }, payload });
  const createEntry = (payload: object) => post("/api/cash-entries", payload);
  const entries = async () => (await t.app.inject({ method: "GET", url: "/api/cash-entries", headers: { cookie } })).json<Entry[]>();
  const counterpartyId = async (name: string) => (await post("/api/counterparties", { name, phone: "+998901234567" })).json<{ id: string }>().id;

  const income = { direction: "in", category: "owner_contribution", amount: 1_000_000, date: "2026-10-01" };
  const expense = { direction: "out", category: "rent", amount: 400_000, date: "2026-10-02" };

  it("creates an inflow and an outflow", async () => {
    const inflow = await createEntry({ ...income, note: "Boshlang'ich kassa" });
    expect(inflow.statusCode).toBe(201);
    expect(inflow.json()).toMatchObject({ direction: "in", category: "owner_contribution", amount: 1_000_000, date: "2026-10-01", note: "Boshlang'ich kassa", counterpartyId: null, source: null });

    const outflow = await createEntry(expense);
    expect(outflow.statusCode).toBe(201);
    expect(outflow.json()).toMatchObject({ direction: "out", category: "rent", amount: 400_000 });
  });

  it("rejects a category that does not belong to the direction", async () => {
    expect((await createEntry({ ...income, category: "rent" })).statusCode).toBe(400);
    expect((await createEntry({ ...expense, category: "other_income" })).statusCode).toBe(400);
    expect((await createEntry({ ...expense, category: "loan_received" })).statusCode).toBe(400);
  });

  it("rejects invalid amounts, dates and categories", async () => {
    for (const bad of [
      { ...income, amount: 0 },
      { ...income, amount: -5 },
      { ...income, amount: 10.5 },
      { ...income, date: "2026-13-45" },
      { ...income, date: "tomorrow" },
      { ...income, category: "sale" },
      { ...income, category: "nonsense" },
    ]) {
      expect((await createEntry(bad)).statusCode, JSON.stringify(bad)).toBe(400);
    }
  });

  it("refuses a loan without a counterparty and accepts one with a counterparty", async () => {
    const loan = { direction: "out", category: "loan_given", amount: 200_000, date: "2026-10-03" };
    const refused = await createEntry(loan);
    expect(refused.statusCode).toBe(400);
    expect(refused.json().code).toBe("COUNTERPARTY_REQUIRED");

    const accepted = await createEntry({ ...loan, counterpartyId: await counterpartyId("Aziz aka") });
    expect(accepted.statusCode).toBe(201);
    expect(accepted.json().counterpartyName).toBe("Aziz aka");
  });

  it("accepts an optional counterparty on other categories but refuses an unknown one", async () => {
    const withPerson = await createEntry({ ...expense, counterpartyId: await counterpartyId("Ijaraga beruvchi") });
    expect(withPerson.statusCode).toBe(201);

    expect((await createEntry({ ...expense, counterpartyId: "64b7f0f0f0f0f0f0f0f0f0f0" })).statusCode).toBe(404);
    expect((await createEntry({ ...expense, counterpartyId: "not-an-id" })).statusCode).toBe(404);
  });

  it("creates and lists counterparties", async () => {
    const created = await post("/api/counterparties", { name: "  Dilshod  " });
    expect(created.statusCode).toBe(201);
    expect(created.json()).toMatchObject({ name: "Dilshod", phone: null });
    expect((await post("/api/counterparties", { name: " " })).statusCode).toBe(400);

    const list = await t.app.inject({ method: "GET", url: "/api/counterparties", headers: { cookie } });
    expect(list.json<{ name: string }[]>().map((c) => c.name)).toContain("Dilshod");
  });

  it("numbers manual entries sequentially, with no duplicates under concurrent creation", async () => {
    const before = (await entries()).length;
    const results = await Promise.all(Array.from({ length: 10 }, () => createEntry(income)));
    const numbers = results.map((r) => r.json<{ number: string }>().number);

    expect(new Set(numbers).size).toBe(10);
    const sequence = numbers.map((n) => Number(n.slice(4))).sort((a, b) => a - b);
    expect(sequence).toEqual(Array.from({ length: 10 }, (_, i) => before + 1 + i));
    expect(numbers[0]).toMatch(/^KAS-\d{4}$/);
  });
});

describe("cash list and running balance", () => {
  let t: TestApp;
  let cookie: string;

  beforeAll(async () => {
    t = await startTestApp();
    cookie = await t.loginAsOwner();
  });
  afterAll(() => t.stop());

  const createEntry = (payload: object) => t.app.inject({ method: "POST", url: "/api/cash-entries", headers: { cookie }, payload });

  it("orders by date and shows a running balance that can go negative", async () => {
    // Created out of date order on purpose.
    await createEntry({ direction: "out", category: "salary", amount: 700_000, date: "2026-10-05" });
    await createEntry({ direction: "in", category: "owner_contribution", amount: 500_000, date: "2026-10-01" });
    await createEntry({ direction: "in", category: "other_income", amount: 100_000, date: "2026-10-09" });
    await createEntry({ direction: "out", category: "travel_cost", amount: 50_000, date: "2026-10-05" });

    const list = (await t.app.inject({ method: "GET", url: "/api/cash-entries", headers: { cookie } })).json<Entry[]>();
    expect(list.map((e) => [e.date, e.category, e.balance])).toEqual([
      ["2026-10-01", "owner_contribution", 500_000],
      ["2026-10-05", "salary", -200_000],
      ["2026-10-05", "travel_cost", -250_000],
      ["2026-10-09", "other_income", -150_000],
    ]);
  });

  it("requires a session", async () => {
    expect((await t.app.inject({ method: "GET", url: "/api/cash-entries" })).statusCode).toBe(401);
    expect((await t.app.inject({ method: "GET", url: "/api/counterparties" })).statusCode).toBe(401);
  });
});
