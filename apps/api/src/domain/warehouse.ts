/** A node in the warehouse tree. `ancestors` is the ids from the root down to the parent, so a subtree is one query. */
export type Warehouse = {
  id: string;
  name: string;
  parentId: string | null;
  ancestors: string[];
};

export type NewWarehouse = Pick<Warehouse, "name" | "parentId" | "ancestors">;
