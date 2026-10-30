import { ObjectId, type Collection, type Db } from "mongodb";
import type { WarehouseRepository } from "../../application/ports/warehouse-repository.js";
import type { Warehouse } from "../../domain/warehouse.js";

type WarehouseDoc = Omit<Warehouse, "id"> & { _id: ObjectId };

const toWarehouse = ({ _id, ...rest }: WarehouseDoc): Warehouse => ({ id: _id.toHexString(), ...rest });

export function makeMongoWarehouseRepository(db: Db): WarehouseRepository {
  const warehouses: Collection<WarehouseDoc> = db.collection("warehouses");

  /** An id that is not a valid ObjectId cannot match any warehouse. */
  const idFilter = (id: string) => (ObjectId.isValid(id) ? { _id: new ObjectId(id) } : null);

  return {
    async create(details) {
      const doc: WarehouseDoc = { _id: new ObjectId(), ...details };
      await warehouses.insertOne(doc);
      return toWarehouse(doc);
    },

    async findById(id) {
      const filter = idFilter(id);
      const doc = filter && (await warehouses.findOne(filter));
      return doc ? toWarehouse(doc) : null;
    },

    async rename(id, name) {
      const filter = idFilter(id);
      const doc = filter && (await warehouses.findOneAndUpdate(filter, { $set: { name } }, { returnDocument: "after" }));
      return doc ? toWarehouse(doc) : null;
    },

    async hasChildren(id) {
      return (await warehouses.countDocuments({ parentId: id }, { limit: 1 })) > 0;
    },

    async delete(id) {
      const filter = idFilter(id);
      const result = filter && (await warehouses.deleteOne(filter));
      return result?.deletedCount === 1;
    },

    async list() {
      const docs = await warehouses.find().collation({ locale: "en" }).sort({ name: 1 }).toArray();
      return docs.map(toWarehouse);
    },
  };
}
