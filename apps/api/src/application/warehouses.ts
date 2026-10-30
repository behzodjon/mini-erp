import type { WarehouseNode } from "@erp/shared";
import { NotFoundError, WarehouseHasChildrenError } from "../domain/errors.js";
import type { Warehouse } from "../domain/warehouse.js";
import type { WarehouseRepository } from "./ports/warehouse-repository.js";

const toNode = ({ id, name, parentId }: Warehouse, children: WarehouseNode[]): WarehouseNode => ({ id, name, parentId, children });

function buildTree(warehouses: Warehouse[]): WarehouseNode[] {
  const byParent = new Map<string | null, Warehouse[]>();
  for (const w of warehouses) byParent.set(w.parentId, [...(byParent.get(w.parentId) ?? []), w]);
  const branch = (parentId: string | null): WarehouseNode[] =>
    (byParent.get(parentId) ?? []).map((w) => toNode(w, branch(w.id)));
  return branch(null);
}

export function makeWarehouseUseCases(deps: { warehouses: WarehouseRepository }) {
  const orNotFound = (warehouse: Warehouse | null): Warehouse => {
    if (!warehouse) throw new NotFoundError("Warehouse");
    return warehouse;
  };

  return {
    async create(details: { name: string; parentId?: string | null }) {
      if (!details.parentId) return deps.warehouses.create({ name: details.name, parentId: null, ancestors: [] });
      const parent = await deps.warehouses.findById(details.parentId);
      if (!parent) throw new NotFoundError("Parent warehouse");
      return deps.warehouses.create({ name: details.name, parentId: parent.id, ancestors: [...parent.ancestors, parent.id] });
    },

    async tree() {
      return buildTree(await deps.warehouses.list());
    },

    async rename(id: string, name: string) {
      return orNotFound(await deps.warehouses.rename(id, name));
    },

    async remove(id: string) {
      orNotFound(await deps.warehouses.findById(id));
      if (await deps.warehouses.hasChildren(id)) throw new WarehouseHasChildrenError();
      await deps.warehouses.delete(id);
    },
  };
}
export type WarehouseUseCases = ReturnType<typeof makeWarehouseUseCases>;
