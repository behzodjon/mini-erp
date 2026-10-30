import type { UseCases } from "./composition-root.js";
import { shopDayOf } from "./domain/shop-calendar.js";

export class SeedRefusedError extends Error {
  constructor() {
    super("The database already has data. Seeding it again would duplicate everything; pass --force to do it anyway.");
  }
}

type Shop = Pick<UseCases, "products" | "warehouses" | "purchases" | "sales" | "stockCounts" | "cash" | "counterparties">;

const DAY_MS = 24 * 60 * 60 * 1000;

async function isEmpty(shop: Shop): Promise<boolean> {
  const [products, warehouses, purchases, sales, counts, cash, counterparties] = await Promise.all([
    shop.products.list({ includeArchived: true }),
    shop.warehouses.tree(),
    shop.purchases.list(),
    shop.sales.list(),
    shop.stockCounts.list(),
    shop.cash.list(),
    shop.counterparties.list(),
  ]);
  return [products, warehouses, purchases, sales, counts, cash, counterparties].every((rows) => rows.length === 0);
}

/**
 * A realistic running shop, built only through the use cases so that averages, balances, cash entries
 * and numbering follow every rule. Refuses a database that already has data unless forced.
 */
export async function seedShop(shop: Shop, options: { force?: boolean } = {}): Promise<void> {
  if (!options.force && !(await isEmpty(shop))) throw new SeedRefusedError();

  // Dates are clamped to the current month, which is what the reports show by default.
  const now = Date.now();
  const monthStart = `${shopDayOf(new Date(now)).slice(0, 8)}01`;
  const day = (daysAgo: number) => {
    const date = shopDayOf(new Date(now - daysAgo * DAY_MS));
    return date < monthStart ? monthStart : date;
  };

  // Locations: two levels deep.
  const main = await shop.warehouses.create({ name: "Asosiy ombor" });
  const rowA = await shop.warehouses.create({ name: "A qator", parentId: main.id });
  const rowB = await shop.warehouses.create({ name: "B qator", parentId: main.id });
  const store = await shop.warehouses.create({ name: "Do'kon" });
  const counter = await shop.warehouses.create({ name: "Peshtaxta", parentId: store.id });
  const fridge = await shop.warehouses.create({ name: "Muzlatgich", parentId: store.id });

  const cola05 = await shop.products.create({ name: "Cola 0.5L", piecesPerBlock: 12, defaultSalePrice: 5500 });
  const cola15 = await shop.products.create({ name: "Cola 1.5L", piecesPerBlock: 6, defaultSalePrice: 11000 });
  const fanta = await shop.products.create({ name: "Fanta 1L", piecesPerBlock: 12, defaultSalePrice: 8500 });
  const water = await shop.products.create({ name: "Suv 1.5L", piecesPerBlock: 6, defaultSalePrice: 3500 });

  const block = (productId: string, warehouseId: string, quantity: number, unitPrice: number) => ({
    productId,
    warehouseId,
    unit: "block" as const,
    quantity,
    unitPrice,
  });
  const executePurchase = async (request: Parameters<Shop["purchases"]["createDraft"]>[0]) =>
    shop.purchases.execute((await shop.purchases.createDraft(request)).id);
  const executeSale = async (request: Parameters<Shop["sales"]["createDraft"]>[0]) =>
    shop.sales.execute((await shop.sales.createDraft(request)).id);

  // Money in: the owner's capital and the loans, before any buying.
  const akmal = await shop.counterparties.create({ name: "Akmal aka", phone: "+998901112233" });
  const sardor = await shop.counterparties.create({ name: "Sardor", phone: "+998935556677" });
  await shop.cash.recordManualEntry({ direction: "in", category: "owner_contribution", amount: 30_000_000, date: day(30), note: "Boshlang'ich kapital" });
  await shop.cash.recordManualEntry({ direction: "in", category: "loan_received", amount: 3_000_000, date: day(20), counterpartyId: sardor.id, note: "Qarz oldim" });
  await shop.cash.recordManualEntry({ direction: "out", category: "loan_given", amount: 1_000_000, date: day(15), counterpartyId: akmal.id, note: "Qarz berdim" });
  await shop.cash.recordManualEntry({ direction: "in", category: "loan_repayment_received", amount: 300_000, date: day(5), counterpartyId: akmal.id });

  // Stock: the opening balance, then purchases at different prices.
  await executePurchase({
    date: day(30),
    openingBalance: true,
    note: "Boshlang'ich qoldiq",
    lines: [
      block(cola05.id, rowA.id, 20, 54_000),
      block(cola15.id, rowA.id, 15, 60_000),
      block(fanta.id, rowB.id, 15, 84_000),
      block(water.id, rowB.id, 30, 12_000),
    ],
  });
  await executePurchase({
    date: day(10),
    lines: [block(cola05.id, counter.id, 8, 60_000), block(fanta.id, fridge.id, 6, 90_000), block(cola15.id, counter.id, 4, 64_800)],
  });
  await executePurchase({
    date: day(3),
    lines: [block(cola05.id, fridge.id, 5, 62_400), block(water.id, counter.id, 10, 13_200)],
  });

  // Sales from several locations.
  await executeSale({ date: day(8), lines: [block(cola05.id, counter.id, 3, 66_000), block(cola15.id, counter.id, 2, 66_000)] });
  await executeSale({ date: day(4), lines: [block(fanta.id, fridge.id, 2, 102_000), block(cola05.id, fridge.id, 2, 66_000)] });
  await executeSale({ date: day(2), lines: [block(cola05.id, rowA.id, 4, 66_000), block(water.id, rowB.id, 5, 21_000)] });
  await executeSale({ date: day(1), lines: [block(water.id, counter.id, 3, 21_000), block(fanta.id, rowB.id, 3, 102_000)] });

  // Running costs.
  await shop.cash.recordManualEntry({ direction: "out", category: "travel_cost", amount: 150_000, date: day(9), note: "Yetkazib berish" });
  await shop.cash.recordManualEntry({ direction: "out", category: "rent", amount: 1_500_000, date: day(7) });
  await shop.cash.recordManualEntry({ direction: "out", category: "salary", amount: 800_000, date: day(6) });

  // A count at the counter finds fewer Cola 0.5L than the books say.
  const shortCount = await shop.stockCounts.createDraft({
    date: day(1),
    warehouseId: counter.id,
    note: "Peshtaxtani sanash",
    lines: [{ productId: cola05.id, unit: "block", quantity: 4 }],
  });
  await shop.stockCounts.execute(shortCount.id);

  // One draft of each kind, left for the reviewer to open.
  await shop.purchases.createDraft({ date: day(0), lines: [block(cola15.id, rowA.id, 10, 61_200)] });
  await shop.sales.createDraft({ date: day(0), lines: [block(cola05.id, fridge.id, 1, 66_000)] });
  await shop.stockCounts.createDraft({ date: day(0), warehouseId: fridge.id, lines: [{ productId: fanta.id, unit: "block", quantity: 4 }] });
}
