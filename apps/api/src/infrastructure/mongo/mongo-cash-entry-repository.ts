import { ObjectId, type ClientSession, type Collection, type Db } from "mongodb";
import type { CashEntryRepository } from "../../application/ports/cash-repositories.js";
import type { CashRecord } from "../../domain/cash.js";

type CashEntryDoc = Omit<CashRecord, "id"> & { _id: ObjectId };

const toRecord = ({ _id, ...rest }: CashEntryDoc): CashRecord => ({ id: _id.toHexString(), ...rest });

export function makeMongoCashEntryRepository(db: Db, session?: ClientSession): CashEntryRepository {
  const entries: Collection<CashEntryDoc> = db.collection("cash_entries");

  return {
    async create(details) {
      const doc: CashEntryDoc = { _id: new ObjectId(), ...details };
      await entries.insertOne(doc, { session });
      return toRecord(doc);
    },

    // ObjectIds grow with creation time, so `_id` breaks ties between entries on the same day.
    async list() {
      const docs = await entries.find().sort({ date: 1, _id: 1 }).toArray();
      return docs.map(toRecord);
    },
  };
}
