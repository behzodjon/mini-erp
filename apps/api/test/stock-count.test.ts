import { describe, expect, it } from "vitest";
import { countDifference } from "../src/domain/stock-count.js";

describe("countDifference", () => {
  it.each([
    ["shortage is negative and valued at average cost", { countedPieces: 7, systemPieces: 10, averageCost: 1_500 }, { difference: -3, value: -4_500 }],
    ["surplus is positive and valued at average cost", { countedPieces: 14, systemPieces: 10, averageCost: 1_500 }, { difference: 4, value: 6_000 }],
    ["a match is zero", { countedPieces: 10, systemPieces: 10, averageCost: 1_500 }, { difference: 0, value: 0 }],
    ["counting nothing on an empty shelf is zero", { countedPieces: 0, systemPieces: 0, averageCost: 0 }, { difference: 0, value: 0 }],
    ["a surplus of a product with no cost yet is worth nothing", { countedPieces: 5, systemPieces: 0, averageCost: 0 }, { difference: 5, value: 0 }],
  ])("%s", (_name, input, expected) => {
    expect(countDifference(input)).toEqual(expected);
  });
});
