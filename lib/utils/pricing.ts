import type { Package } from "@/lib/db/types";

/**
 * Returns true if the arrival date falls on Friday (5) or Saturday (6).
 * Uses local date parsing to avoid UTC timezone shift.
 */
export function isWeekendArrival(dateStr: string): boolean {
  const [y, m, d] = dateStr.split("-").map(Number);
  const day = new Date(y, m - 1, d).getDay(); // 0=Sun … 5=Fri 6=Sat
  return day === 5 || day === 6;
}

/**
 * Calculate total price for a package + number of people + arrival date.
 */
export function calcTotal(
  pkg: Pick<Package, "weekend_price" | "weekday_price">,
  people: number,
  arrivalDate: string
): number {
  const price = isWeekendArrival(arrivalDate) ? pkg.weekend_price : pkg.weekday_price;
  return Math.round(price * people * 100) / 100;
}

/**
 * Calculate remaining amount = total - deposit (floored to 2 decimal places).
 */
export function calcRemaining(total: number, deposit: number): number {
  return Math.max(0, Math.round((total - deposit) * 100) / 100);
}
