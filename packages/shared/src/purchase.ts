import { z } from "zod";
import { isoDate } from "./date.js";

export const quantityUnits = ["piece", "block"] as const;
export type QuantityUnit = (typeof quantityUnits)[number];

const purchaseLineRequestSchema = z.strictObject({
  productId: z.string().min(1),
  warehouseId: z.string().min(1),
  /** The unit the quantity and the price were typed in. */
  unit: z.enum(quantityUnits),
  quantity: z.number().int().positive(),
  /** Whole so'm per piece, or per block when `unit` is block. */
  unitPrice: z.number().int().nonnegative(),
});
export type PurchaseLineRequest = z.infer<typeof purchaseLineRequestSchema>;

/** Used for both creating a draft and replacing it. */
export const savePurchaseRequestSchema = z.strictObject({
  date: isoDate,
  /** Pre-fills new lines in the UI; each line still carries its own warehouse. */
  defaultWarehouseId: z.string().min(1).nullish(),
  openingBalance: z.boolean().optional(),
  note: z.string().trim().optional(),
  lines: z.array(purchaseLineRequestSchema).min(1),
});
export type SavePurchaseRequest = z.infer<typeof savePurchaseRequestSchema>;

export type PurchaseLine = PurchaseLineRequest & {
  /** `quantity` normalised to pieces. */
  pieces: number;
  /** Line total divided by pieces, rounded to whole so'm. Display only: the total is exact. */
  pricePerPiece: number;
  lineTotal: number;
};

export type PurchaseStatus = "draft" | "executed";

export type Purchase = {
  id: string;
  number: string;
  status: PurchaseStatus;
  date: string;
  defaultWarehouseId: string | null;
  openingBalance: boolean;
  note: string;
  lines: PurchaseLine[];
  total: number;
  /** ISO timestamp; null while the purchase is a draft. */
  executedAt: string | null;
};
