import { ObjectId, type Collection, type Db } from "mongodb";
import type { ProductRepository } from "../../application/ports/product-repository.js";
import type { Product } from "../../domain/product.js";

type ProductDoc = Omit<Product, "id"> & { _id: ObjectId };

const toProduct = ({ _id, ...rest }: ProductDoc): Product => ({ id: _id.toHexString(), ...rest });

const escapeRegex = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

export function makeMongoProductRepository(db: Db): ProductRepository {
  const products: Collection<ProductDoc> = db.collection("products");

  /** An id that is not a valid ObjectId cannot match any product. */
  const idFilter = (id: string) => (ObjectId.isValid(id) ? { _id: new ObjectId(id) } : null);

  async function updateOne(id: string, set: Partial<ProductDoc>): Promise<Product | null> {
    const filter = idFilter(id);
    if (!filter) return null;
    // An empty $set is a Mongo error; an edit with no changes just returns the product.
    const defined = Object.fromEntries(Object.entries(set).filter(([, v]) => v !== undefined));
    const doc = Object.keys(defined).length
      ? await products.findOneAndUpdate(filter, { $set: defined }, { returnDocument: "after" })
      : await products.findOne(filter);
    return doc && toProduct(doc);
  }

  return {
    async create(details) {
      const doc: ProductDoc = { _id: new ObjectId(), ...details, averageCost: 0, onHandQuantity: 0, archived: false };
      await products.insertOne(doc);
      return toProduct(doc);
    },

    update: (id, changes) => updateOne(id, changes),

    setArchived: (id, archived) => updateOne(id, { archived }),

    async list({ search, includeArchived }) {
      const filter: Record<string, unknown> = {};
      if (!includeArchived) filter.archived = false;
      if (search) {
        const text = new RegExp(escapeRegex(search), "i");
        filter.$or = [{ name: text }, { sku: text }];
      }
      const docs = await products.find(filter).collation({ locale: "en" }).sort({ name: 1 }).toArray();
      return docs.map(toProduct);
    },
  };
}
