import { describe, expect, it } from "vitest";
import { findShortages } from "../src/domain/sale.js";

const line = (productId: string, warehouseId: string, pieces: number) => ({ productId, warehouseId, pieces });
const balance = (productId: string, warehouseId: string, quantity: number) => ({ productId, warehouseId, quantity });

describe("findShortages", () => {
  it.each([
    ["enough stock", [line("p", "w", 5)], [balance("p", "w", 5)], []],
    ["nothing on the shelf", [line("p", "w", 1)], [], [{ line: 0, productId: "p", warehouseId: "w", requested: 1, available: 0 }]],
    ["one line short", [line("p", "w", 6)], [balance("p", "w", 5)], [{ line: 0, productId: "p", warehouseId: "w", requested: 6, available: 5 }]],
    [
      "two lines of one pair exceed it together: both are named",
      [line("p", "w", 3), line("p", "w", 3)],
      [balance("p", "w", 5)],
      [
        { line: 0, productId: "p", warehouseId: "w", requested: 6, available: 5 },
        { line: 1, productId: "p", warehouseId: "w", requested: 6, available: 5 },
      ],
    ],
    ["same product at two locations, each within its own stock", [line("p", "a", 4), line("p", "b", 4)], [balance("p", "a", 5), balance("p", "b", 5)], []],
    ["stock elsewhere does not cover this location", [line("p", "a", 4)], [balance("p", "b", 50)], [{ line: 0, productId: "p", warehouseId: "a", requested: 4, available: 0 }]],
    [
      "only the short pair is reported",
      [line("p", "w", 1), line("q", "w", 9)],
      [balance("p", "w", 1), balance("q", "w", 2)],
      [{ line: 1, productId: "q", warehouseId: "w", requested: 9, available: 2 }],
    ],
  ])("%s", (_name, lines, balances, expected) => {
    expect(findShortages(lines, balances)).toEqual(expected);
  });
});
