import type { Purchase, PurchaseLine } from "@erp/shared";

export type { Purchase, PurchaseLine };

/** A purchase before it has an id. */
export type NewPurchase = Omit<Purchase, "id">;
