import { ObjectId, type ClientSession, type Collection, type Db } from "mongodb";
import type { SaleRepository } from "../../application/ports/sale-repository.js";
import type { Sale } from "../../domain/sale.js";

/** Stored with a real Date for the execution time; the API shows it as an ISO string. */
type SaleDoc = Omit<Sale, "id" | "executedAt"> & { _id: ObjectId; executedAt: Date | null };

const toSale = ({ _id, executedAt, ...rest }: SaleDoc): Sale => ({
  id: _id.toHexString(),
  ...rest,
  executedAt: executedAt?.toISOString() ?? null,
});

export function makeMongoSaleRepository(db: Db, session?: ClientSession): SaleRepository {
  const sales: Collection<SaleDoc> = db.collection("sales");
  const idFilter = (id: string) => (ObjectId.isValid(id) ? { _id: new ObjectId(id) } : null);

  return {
    async create(sale) {
      const doc: SaleDoc = { _id: new ObjectId(), ...sale, executedAt: null };
      await sales.insertOne(doc, { session });
      return toSale(doc);
    },

    async findById(id) {
      const filter = idFilter(id);
      const doc = filter && (await sales.findOne(filter, { session }));
      return doc ? toSale(doc) : null;
    },

    async list() {
      return (await sales.find({}, { session }).sort({ _id: -1 }).toArray()).map(toSale);
    },

    async listExecuted({ from, until }) {
      const docs = await sales.find({ status: "executed", executedAt: { $gte: from, $lt: until } }, { session }).sort({ executedAt: 1 }).toArray();
      return docs.map(toSale);
    },

    async replaceDraft(id, content) {
      const filter = idFilter(id);
      const doc = filter && (await sales.findOneAndUpdate({ ...filter, status: "draft" }, { $set: content }, { returnDocument: "after", session }));
      return doc ? toSale(doc) : null;
    },

    async deleteDraft(id) {
      const filter = idFilter(id);
      return !!filter && (await sales.deleteOne({ ...filter, status: "draft" }, { session })).deletedCount === 1;
    },

    async markExecuted(id, lines, total, executedAt) {
      const filter = idFilter(id);
      const doc =
        filter &&
        (await sales.findOneAndUpdate(
          { ...filter, status: "draft" },
          { $set: { status: "executed", lines, total, executedAt } },
          { returnDocument: "after", session },
        ));
      return doc ? toSale(doc) : null;
    },
  };
}
