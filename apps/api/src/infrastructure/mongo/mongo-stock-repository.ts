import type { ClientSession, Db } from "mongodb";
import type { StockRepository } from "../../application/ports/stock-repository.js";
import type { StockMovement } from "../../domain/stock.js";

type BalanceDoc = { productId: string; warehouseId: string; quantity: number };

/** The unique key the balance upserts rely on; call once at startup. */
export async function ensureStockIndexes(db: Db): Promise<void> {
  await db.collection("stock_balances").createIndex({ productId: 1, warehouseId: 1 }, { unique: true });
  await db.collection("stock_movements").createIndex({ productId: 1 });
}

export function makeMongoStockRepository(db: Db, session?: ClientSession): StockRepository {
  const movements = db.collection<StockMovement>("stock_movements");
  const balances = db.collection<BalanceDoc>("stock_balances");

  return {
    async post(batch) {
      if (batch.length === 0) return;
      await movements.insertMany(batch.map((m) => ({ ...m })), { session });
      // Sums per (product, location) first: two lines for the same pair must not race each other's upsert.
      const deltas = new Map<string, BalanceDoc>();
      for (const m of batch) {
        const key = `${m.productId}:${m.warehouseId}`;
        const entry = deltas.get(key) ?? { productId: m.productId, warehouseId: m.warehouseId, quantity: 0 };
        entry.quantity += m.quantity;
        deltas.set(key, entry);
      }
      for (const d of deltas.values()) {
        await balances.updateOne(
          { productId: d.productId, warehouseId: d.warehouseId },
          { $inc: { quantity: d.quantity } },
          { upsert: true, session },
        );
      }
    },

    async productHasMovements(productId) {
      return (await movements.countDocuments({ productId }, { limit: 1, session })) > 0;
    },

    async warehouseHoldsStock(warehouseId) {
      return (await balances.countDocuments({ warehouseId, quantity: { $ne: 0 } }, { limit: 1, session })) > 0;
    },

    async balances() {
      const docs = await balances.find({ quantity: { $ne: 0 } }, { session }).toArray();
      return docs.map(({ productId, warehouseId, quantity }) => ({ productId, warehouseId, quantity }));
    },
  };
}
