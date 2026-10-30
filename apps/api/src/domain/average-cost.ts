/**
 * Moving weighted average cost per piece, in whole so'm, after receiving goods.
 * With nothing (or less) on hand the average is simply the price just paid.
 */
export function nextAverageCost(input: {
  onHandQuantity: number;
  averageCost: number;
  purchasedPieces: number;
  purchaseTotal: number;
}): number {
  const { onHandQuantity, averageCost, purchasedPieces, purchaseTotal } = input;
  if (onHandQuantity <= 0) return Math.round(purchaseTotal / purchasedPieces);
  return Math.round((onHandQuantity * averageCost + purchaseTotal) / (onHandQuantity + purchasedPieces));
}
