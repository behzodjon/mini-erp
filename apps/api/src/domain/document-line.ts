import type { DocumentLineRequest, PurchaseLine } from "@erp/shared";
import { toPieces } from "./quantity.js";

/**
 * Turns what the owner typed into a stored line. The total is exact (entered quantity × entered price);
 * the per-piece price is derived from it and only rounded for display.
 */
export function normaliseLine(request: DocumentLineRequest, piecesPerBlock: number): PurchaseLine {
  const pieces = toPieces(request.unit, request.quantity, piecesPerBlock);
  const lineTotal = request.quantity * request.unitPrice;
  return { ...request, pieces, pricePerPiece: Math.round(lineTotal / pieces), lineTotal };
}

export const documentTotal = (lines: readonly Pick<PurchaseLine, "lineTotal">[]): number =>
  lines.reduce((sum, line) => sum + line.lineTotal, 0);
