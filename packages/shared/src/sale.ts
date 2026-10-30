import { z } from "zod";
import { isoDate } from "./date.js";
import { documentLineRequestSchema, type PurchaseLine } from "./purchase.js";

/** Used for both creating a draft and replacing it. */
export const saveSaleRequestSchema = z.strictObject({
  date: isoDate,
  /** Pre-fills new lines in the UI; each line still carries its own warehouse. */
  defaultWarehouseId: z.string().min(1).nullish(),
  note: z.string().trim().optional(),
  lines: z.array(documentLineRequestSchema).min(1),
});
export type SaveSaleRequest = z.infer<typeof saveSaleRequestSchema>;

export type SaleLine = PurchaseLine & {
  /** The product's average cost per piece when the sale was executed; null while it is a draft. */
  costPerPiece: number | null;
};

export type SaleStatus = "draft" | "executed";

export type Sale = {
  id: string;
  number: string;
  status: SaleStatus;
  date: string;
  defaultWarehouseId: string | null;
  note: string;
  lines: SaleLine[];
  total: number;
  /** ISO timestamp; null while the sale is a draft. */
  executedAt: string | null;
};

/** What stopped a sale from executing: one entry per line of an over-subscribed (product, location) pair. */
export type StockShortage = {
  /** Zero-based index into the sale's lines. */
  line: number;
  productId: string;
  warehouseId: string;
  /** Pieces the sale takes from this location across all its lines. */
  requested: number;
  available: number;
};
