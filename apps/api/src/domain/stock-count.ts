import type { StockCount, StockCountLine } from "@erp/shared";

export type { StockCount, StockCountLine };

/** A stock count before it has an id. */
export type NewStockCount = Omit<StockCount, "id">;

/** What a count changes for one product at one node, valued at the product's average cost (which a count never moves). */
export function countDifference(input: { countedPieces: number; systemPieces: number; averageCost: number }): {
  difference: number;
  value: number;
} {
  const difference = input.countedPieces - input.systemPieces;
  // `|| 0` keeps a zero difference from producing -0.
  return { difference, value: difference * input.averageCost || 0 };
}
