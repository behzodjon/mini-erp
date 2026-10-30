import { describe, expect, it } from "vitest";
import { nextAverageCost } from "../src/domain/average-cost.js";

describe("nextAverageCost", () => {
  it.each([
    { name: "from zero stock it is the purchase price", onHand: 0, avg: 0, pieces: 10, total: 100_000, expected: 10_000 },
    { name: "ignores the old average when stock is zero", onHand: 0, avg: 5_000, pieces: 4, total: 8_000, expected: 2_000 },
    { name: "ignores the old average when stock is negative", onHand: -3, avg: 5_000, pieces: 4, total: 8_000, expected: 2_000 },
    { name: "blends old stock and the purchase", onHand: 10, avg: 1_000, pieces: 10, total: 30_000, expected: 2_000 },
    { name: "weights by quantity", onHand: 30, avg: 1_000, pieces: 10, total: 20_000, expected: 1_250 },
    { name: "rounds a fractional average up from .5", onHand: 1, avg: 1, pieces: 1, total: 2, expected: 2 },
    { name: "rounds a fractional average down below .5", onHand: 3, avg: 1_000, pieces: 4, total: 5_000, expected: 1_143 },
    { name: "rounds a block price that does not divide evenly", onHand: 0, avg: 0, pieces: 12, total: 100_000, expected: 8_333 },
  ])("$name", ({ onHand, avg, pieces, total, expected }) => {
    expect(nextAverageCost({ onHandQuantity: onHand, averageCost: avg, purchasedPieces: pieces, purchaseTotal: total })).toBe(expected);
  });
});
