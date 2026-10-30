import type { QuantityUnit } from "@erp/shared";

/** Quantities are stored as whole pieces; a block is `piecesPerBlock` of them. */
export const toPieces = (unit: QuantityUnit, quantity: number, piecesPerBlock: number): number =>
  unit === "block" ? quantity * piecesPerBlock : quantity;

export const splitIntoBlocks = (pieces: number, piecesPerBlock: number): { blocks: number; pieces: number } => ({
  blocks: Math.floor(pieces / piecesPerBlock),
  pieces: pieces % piecesPerBlock,
});
