import { SHOP_UTC_OFFSET_HOURS } from "@erp/shared";

const HOUR_MS = 3600 * 1000;
const DAY_MS = 24 * HOUR_MS;

const startOfShopDay = (day: string) => Date.parse(`${day}T00:00:00Z`) - SHOP_UTC_OFFSET_HOURS * HOUR_MS;

/** The instants that bound whole shop days: `from` 00:00 up to, but not including, the day after `to`. */
export function shopDaysRange(from: string, to: string): { start: Date; end: Date } {
  return { start: new Date(startOfShopDay(from)), end: new Date(startOfShopDay(to) + DAY_MS) };
}

/** The shop day (YYYY-MM-DD) an instant falls on. */
export const shopDayOf = (instant: Date): string => new Date(instant.getTime() + SHOP_UTC_OFFSET_HOURS * HOUR_MS).toISOString().slice(0, 10);
