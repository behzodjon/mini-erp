import { ObjectId, type ClientSession, type Collection, type Db } from "mongodb";
import type { StockCountRepository } from "../../application/ports/stock-count-repository.js";
import type { StockCount } from "../../domain/stock-count.js";

/** Stored with a real Date for the execution time; the API shows it as an ISO string. */
type StockCountDoc = Omit<StockCount, "id" | "executedAt"> & { _id: ObjectId; executedAt: Date | null };

const toStockCount = ({ _id, executedAt, ...rest }: StockCountDoc): StockCount => ({
  id: _id.toHexString(),
  ...rest,
  executedAt: executedAt?.toISOString() ?? null,
});

export function makeMongoStockCountRepository(db: Db, session?: ClientSession): StockCountRepository {
  const counts: Collection<StockCountDoc> = db.collection("stock_counts");
  const idFilter = (id: string) => (ObjectId.isValid(id) ? { _id: new ObjectId(id) } : null);

  return {
    async create(count) {
      const doc: StockCountDoc = { _id: new ObjectId(), ...count, executedAt: null };
      await counts.insertOne(doc, { session });
      return toStockCount(doc);
    },

    async findById(id) {
      const filter = idFilter(id);
      const doc = filter && (await counts.findOne(filter, { session }));
      return doc ? toStockCount(doc) : null;
    },

    async list() {
      return (await counts.find({}, { session }).sort({ _id: -1 }).toArray()).map(toStockCount);
    },

    async executedValue({ from, until }) {
      const [sum] = await counts
        .aggregate<{ total: number }>(
          [
            { $match: { status: "executed", executedAt: { $gte: from, $lt: until } } },
            { $group: { _id: null, total: { $sum: "$totalValue" } } },
          ],
          { session },
        )
        .toArray();
      return sum?.total ?? 0;
    },

    async replaceDraft(id, content) {
      const filter = idFilter(id);
      const doc = filter && (await counts.findOneAndUpdate({ ...filter, status: "draft" }, { $set: content }, { returnDocument: "after", session }));
      return doc ? toStockCount(doc) : null;
    },

    async deleteDraft(id) {
      const filter = idFilter(id);
      return !!filter && (await counts.deleteOne({ ...filter, status: "draft" }, { session })).deletedCount === 1;
    },

    async markExecuted(id, lines, totalValue, executedAt) {
      const filter = idFilter(id);
      const doc =
        filter &&
        (await counts.findOneAndUpdate(
          { ...filter, status: "draft" },
          { $set: { status: "executed", lines, totalValue, executedAt } },
          { returnDocument: "after", session },
        ));
      return doc ? toStockCount(doc) : null;
    },
  };
}
