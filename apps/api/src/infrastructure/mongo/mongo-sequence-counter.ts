import type { Db } from "mongodb";
import type { SequenceCounter } from "../../application/ports/sequence-counter.js";

type CounterDoc = { _id: string; value: number };

/** One document per key; `$inc` with upsert is atomic, so concurrent callers each get a distinct number. */
export function makeMongoSequenceCounter(db: Db): SequenceCounter {
  const counters = db.collection<CounterDoc>("counters");
  return {
    async next(key) {
      const doc = await counters.findOneAndUpdate(
        { _id: key },
        { $inc: { value: 1 } },
        { upsert: true, returnDocument: "after" },
      );
      if (!doc) throw new Error(`counter ${key} was not created`);
      return doc.value;
    },
  };
}
