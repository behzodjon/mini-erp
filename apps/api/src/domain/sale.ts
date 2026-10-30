import type { PurchaseLine, Sale, SaleLine, StockShortage } from "@erp/shared";
import type { StockBalance } from "./stock.js";

export type { Sale, SaleLine };

/** A sale before it has an id. */
export type NewSale = Omit<Sale, "id">;

const keyOf = (l: { productId: string; warehouseId: string }) => `${l.productId}:${l.warehouseId}`;

/**
 * Compares what the lines take from each (product, location) with what is there. Lines that share a pair are
 * added together, and every line of a pair that comes up short is reported, so none of them is left unnamed.
 */
export function findShortages(
  lines: readonly Pick<PurchaseLine, "productId" | "warehouseId" | "pieces">[],
  balances: readonly StockBalance[],
): StockShortage[] {
  const available = new Map(balances.map((b) => [keyOf(b), b.quantity] as const));
  const requested = new Map<string, number>();
  for (const l of lines) requested.set(keyOf(l), (requested.get(keyOf(l)) ?? 0) + l.pieces);

  return lines.flatMap((l, line) => {
    const have = available.get(keyOf(l)) ?? 0;
    const want = requested.get(keyOf(l))!;
    return want > have ? [{ line, productId: l.productId, warehouseId: l.warehouseId, requested: want, available: have }] : [];
  });
}
