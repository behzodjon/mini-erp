import { z } from "zod";

const warehouseName = z.string().trim().min(1);

export const createWarehouseRequestSchema = z.strictObject({
  name: warehouseName,
  parentId: z.string().min(1).nullish(),
});

/** Only the name can change; a node never moves. */
export const renameWarehouseRequestSchema = z.strictObject({ name: warehouseName });

export type CreateWarehouseRequest = z.infer<typeof createWarehouseRequestSchema>;
export type RenameWarehouseRequest = z.infer<typeof renameWarehouseRequestSchema>;

export type Warehouse = { id: string; name: string; parentId: string | null };
export type WarehouseNode = Warehouse & { children: WarehouseNode[] };
