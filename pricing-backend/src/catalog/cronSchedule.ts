/** Weekly catalog refresh: Sunday 03:00 server local time. */
export const WEEKLY_CATALOG_CRON = "0 3 * * 0";

/** Human-readable schedule for status API and docs. */
export const WEEKLY_CATALOG_CRON_LABEL = "Sunday 03:00 (server local time)";

/** Next run of `0 3 * * 0` after `from` (local time). */
export function getNextWeeklyCatalogRun(from: Date = new Date()): Date {
  const next = new Date(from);
  next.setHours(3, 0, 0, 0);
  const day = next.getDay();
  const daysUntilSunday = (7 - day) % 7;
  if (daysUntilSunday === 0 && from >= next) {
    next.setDate(next.getDate() + 7);
  } else {
    next.setDate(next.getDate() + daysUntilSunday);
  }
  return next;
}
