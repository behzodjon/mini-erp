import { z } from "zod";
import { isoDate } from "./date.js";
import { quantityUnits } from "./purchase.js";

export const stockCountLineRequestSchema = z.strictObject({
  productId: z.string().min(1),
  /** The unit the counted quantity was typed in. */
  unit: z.enum(quantityUnits),
  /** What the owner counted; zero is a valid count. */
  quantity: z.number().int().nonnegative(),
});
export type StockCountLineRequest = z.infer<typeof stockCountLineRequestSchema>;

/** Used for both creating a draft and replacing it. */
export const saveStockCountRequestSchema = z.strictObject({
  date: isoDate,
  /** The one warehouse node being counted. */
  warehouseId: z.string().min(1),
  note: z.string().trim().optional(),
  lines: z
    .array(stockCountLineRequestSchema)
    .min(1)
    .refine((lines) => new Set(lines.map((l) => l.productId)).size === lines.length, "A product can be counted once per count"),
});
export type SaveStockCountRequest = z.infer<typeof saveStockCountRequestSchema>;

export type StockCountLine = StockCountLineRequest & {
  /** `quantity` normalised to pieces. */
  countedPieces: number;
  /** What the system held at the node when the count was executed; null while it is a draft. */
  systemPieces: number | null;
  /** Counted − system: negative for a shortage, positive for a surplus. Null while it is a draft. */
  difference: number | null;
  /** The product's average cost per piece when the count was executed. Null while it is a draft. */
  unitCost: number | null;
  /** `difference` at `unitCost`, in whole so'm. Null while it is a draft. */
  value: number | null;
};

export type StockCountStatus = "draft" | "executed";

export type StockCount = {
  id: string;
  number: string;
  status: StockCountStatus;
  date: string;
  warehouseId: string;
  note: string;
  lines: StockCountLine[];
  /** Net value of all differences; null while the count is a draft. */
  totalValue: number | null;
  /** ISO timestamp; null while the count is a draft. */
  executedAt: string | null;
};
