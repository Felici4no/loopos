/**
 * Date utilities for LoopOS.
 *
 * All date handling in LoopOS uses ISO strings (YYYY-MM-DD) for day-level data
 * and full ISO-8601 timestamps for event times.
 * Timezone awareness is handled at the user level (user.timezone field).
 */

/**
 * Returns today's date as a YYYY-MM-DD string in local time.
 */
export function todayISO(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/**
 * Returns a YYYY-MM-DD string for a given Date object.
 */
export function toISODate(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/**
 * Parses a YYYY-MM-DD string into a Date at midnight UTC.
 */
export function fromISODate(isoDate: string): Date {
  return new Date(`${isoDate}T00:00:00.000Z`);
}

/**
 * Returns the ISO week number (1–53) for a given date.
 */
export function isoWeekNumber(date: Date): number {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
}

/**
 * Adds N days to an ISO date string and returns a new ISO date string.
 */
export function addDays(isoDate: string, days: number): string {
  const date = fromISODate(isoDate);
  date.setUTCDate(date.getUTCDate() + days);
  return toISODate(date);
}

/**
 * Returns true if isoDate is today's date (in local time).
 */
export function isToday(isoDate: string): boolean {
  return isoDate === todayISO();
}
