import { ObjectId, type ClientSession, type Collection, type Db } from "mongodb";
import type { PurchaseRepository } from "../../application/ports/purchase-repository.js";
import type { Purchase } from "../../domain/purchase.js";

/** Stored with a real Date for the execution time; the API shows it as an ISO string. */
type PurchaseDoc = Omit<Purchase, "id" | "executedAt"> & { _id: ObjectId; executedAt: Date | null };

const toPurchase = ({ _id, executedAt, ...rest }: PurchaseDoc): Purchase => ({
  id: _id.toHexString(),
  ...rest,
  executedAt: executedAt?.toISOString() ?? null,
});

export function makeMongoPurchaseRepository(db: Db, session?: ClientSession): PurchaseRepository {
  const purchases: Collection<PurchaseDoc> = db.collection("purchases");
  const idFilter = (id: string) => (ObjectId.isValid(id) ? { _id: new ObjectId(id) } : null);

  return {
    async create(purchase) {
      const doc: PurchaseDoc = { _id: new ObjectId(), ...purchase, executedAt: null };
      await purchases.insertOne(doc, { session });
      return toPurchase(doc);
    },

    async findById(id) {
      const filter = idFilter(id);
      const doc = filter && (await purchases.findOne(filter, { session }));
      return doc ? toPurchase(doc) : null;
    },

    async list() {
      return (await purchases.find({}, { session }).sort({ _id: -1 }).toArray()).map(toPurchase);
    },

    async replaceDraft(id, content) {
      const filter = idFilter(id);
      const doc = filter && (await purchases.findOneAndUpdate({ ...filter, status: "draft" }, { $set: content }, { returnDocument: "after", session }));
      return doc ? toPurchase(doc) : null;
    },

    async deleteDraft(id) {
      const filter = idFilter(id);
      return !!filter && (await purchases.deleteOne({ ...filter, status: "draft" }, { session })).deletedCount === 1;
    },

    async markExecuted(id, lines, total, executedAt) {
      const filter = idFilter(id);
      const doc =
        filter &&
        (await purchases.findOneAndUpdate(
          { ...filter, status: "draft" },
          { $set: { status: "executed", lines, total, executedAt } },
          { returnDocument: "after", session },
        ));
      return doc ? toPurchase(doc) : null;
    },
  };
}
