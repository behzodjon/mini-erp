/** The shop works in Tashkent time: UTC+5 all year, no daylight saving. */
const SHOP_UTC_OFFSET_HOURS = 5;
const DAY_MS = 24 * 3600 * 1000;

/** The instants that bound whole shop days: `from` 00:00 up to, but not including, the day after `to`. */
export function shopDaysRange(from: string, to: string): { start: Date; end: Date } {
  const startOfShopDay = (day: string) => Date.parse(`${day}T00:00:00Z`) - SHOP_UTC_OFFSET_HOURS * 3600 * 1000;
  return { start: new Date(startOfShopDay(from)), end: new Date(startOfShopDay(to) + DAY_MS) };
}
