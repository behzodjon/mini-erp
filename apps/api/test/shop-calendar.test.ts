import { describe, expect, it } from "vitest";
import { shopDayOf, shopDaysRange } from "../src/domain/shop-calendar.js";

describe("shop calendar (Tashkent, UTC+5)", () => {
  it.each([
    // [instant (UTC), shop day]
    ["2026-10-29T18:59:59.999Z", "2026-10-29"],
    ["2026-10-29T19:00:00.000Z", "2026-10-30"], // local midnight
    ["2026-10-30T18:59:59.999Z", "2026-10-30"],
    ["2026-12-31T19:00:00.000Z", "2027-01-01"], // across a year end
  ])("puts %s on shop day %s", (instant, day) => {
    expect(shopDayOf(new Date(instant))).toBe(day);
  });

  it.each([
    ["2026-10-30", "2026-10-30", "2026-10-29T19:00:00.000Z", "2026-10-30T19:00:00.000Z"],
    ["2026-10-28", "2026-10-30", "2026-10-27T19:00:00.000Z", "2026-10-30T19:00:00.000Z"],
    ["2026-12-31", "2026-12-31", "2026-12-30T19:00:00.000Z", "2026-12-31T19:00:00.000Z"],
  ])("covers whole shop days %s to %s as [%s, %s)", (from, to, start, end) => {
    const range = shopDaysRange(from, to);
    expect([range.start.toISOString(), range.end.toISOString()]).toEqual([start, end]);
  });
});
