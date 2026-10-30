import type { NewPurchase, Purchase, PurchaseLine } from "../../domain/purchase.js";

/** What a draft owns; the number, status and execution time are not editable. */
export type PurchaseContent = Pick<Purchase, "date" | "defaultWarehouseId" | "openingBalance" | "note" | "lines" | "total">;

export interface PurchaseRepository {
  create(purchase: NewPurchase): Promise<Purchase>;
  findById(id: string): Promise<Purchase | null>;
  /** Newest first. */
  list(): Promise<Purchase[]>;
  /** Resolves null when the purchase does not exist or is no longer a draft. */
  replaceDraft(id: string, content: PurchaseContent): Promise<Purchase | null>;
  /** False when the purchase does not exist or is no longer a draft. */
  deleteDraft(id: string): Promise<boolean>;
  /** The conditional draft → executed flip. Null when it is not a draft any more, so it can only happen once. */
  markExecuted(id: string, lines: PurchaseLine[], total: number, executedAt: Date): Promise<Purchase | null>;
}
