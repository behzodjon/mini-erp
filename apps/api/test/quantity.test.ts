import { describe, expect, it } from "vitest";
import { splitIntoBlocks, toPieces } from "../src/domain/quantity.js";

describe("toPieces", () => {
  it.each([
    { unit: "piece", quantity: 5, piecesPerBlock: 12, pieces: 5 },
    { unit: "block", quantity: 3, piecesPerBlock: 12, pieces: 36 },
    { unit: "block", quantity: 1, piecesPerBlock: 20, pieces: 20 },
    { unit: "block", quantity: 4, piecesPerBlock: 1, pieces: 4 },
    { unit: "piece", quantity: 0, piecesPerBlock: 12, pieces: 0 },
  ] as const)("$quantity $unit at $piecesPerBlock per block is $pieces pieces", ({ unit, quantity, piecesPerBlock, pieces }) => {
    expect(toPieces(unit, quantity, piecesPerBlock)).toBe(pieces);
  });
});

describe("splitIntoBlocks", () => {
  it.each([
    { pieces: 24, piecesPerBlock: 12, blocks: 2, remainder: 0 },
    { pieces: 30, piecesPerBlock: 12, blocks: 2, remainder: 6 },
    { pieces: 5, piecesPerBlock: 12, blocks: 0, remainder: 5 },
    { pieces: 0, piecesPerBlock: 12, blocks: 0, remainder: 0 },
    { pieces: 7, piecesPerBlock: 1, blocks: 7, remainder: 0 },
  ])("$pieces pieces at $piecesPerBlock per block is $blocks blocks + $remainder", ({ pieces, piecesPerBlock, blocks, remainder }) => {
    expect(splitIntoBlocks(pieces, piecesPerBlock)).toEqual({ blocks, pieces: remainder });
  });
});
