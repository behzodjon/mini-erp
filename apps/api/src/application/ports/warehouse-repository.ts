import type { NewWarehouse, Warehouse } from "../../domain/warehouse.js";

export interface WarehouseRepository {
  create(warehouse: NewWarehouse): Promise<Warehouse>;
  /** Null when the id matches no warehouse. */
  findById(id: string): Promise<Warehouse | null>;
  rename(id: string, name: string): Promise<Warehouse | null>;
  hasChildren(id: string): Promise<boolean>;
  /** Returns false when the id matches no warehouse. */
  delete(id: string): Promise<boolean>;
  list(): Promise<Warehouse[]>;
}
