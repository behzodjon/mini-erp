import { ObjectId, type Collection, type Db } from "mongodb";
import type { CounterpartyRepository } from "../../application/ports/cash-repositories.js";
import type { Counterparty } from "../../domain/cash.js";

type CounterpartyDoc = Omit<Counterparty, "id"> & { _id: ObjectId };

const toCounterparty = ({ _id, ...rest }: CounterpartyDoc): Counterparty => ({ id: _id.toHexString(), ...rest });

export function makeMongoCounterpartyRepository(db: Db): CounterpartyRepository {
  const counterparties: Collection<CounterpartyDoc> = db.collection("counterparties");

  return {
    async create(details) {
      const doc: CounterpartyDoc = { _id: new ObjectId(), ...details };
      await counterparties.insertOne(doc);
      return toCounterparty(doc);
    },

    async findById(id) {
      // An id that is not a valid ObjectId cannot match any counterparty.
      const doc = ObjectId.isValid(id) ? await counterparties.findOne({ _id: new ObjectId(id) }) : null;
      return doc && toCounterparty(doc);
    },

    async list() {
      const docs = await counterparties.find().collation({ locale: "en" }).sort({ name: 1 }).toArray();
      return docs.map(toCounterparty);
    },
  };
}
