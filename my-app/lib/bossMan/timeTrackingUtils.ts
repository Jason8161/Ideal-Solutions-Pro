import type { TimeEntry } from "@/lib/bossMan/timeTrackingTypes";

export function parsePayRateString(value: string | undefined): number {
  if (!value) return 0;
  const n = parseFloat(value.replace(/[^0-9.]/g, ""));
  return Number.isFinite(n) ? n : 0;
}

export function entryDurationMs(entry: TimeEntry, nowMs = Date.now()): number {
  const start = new Date(entry.clockIn).getTime();
  if (Number.isNaN(start)) return 0;
  const end = entry.clockOut ? new Date(entry.clockOut).getTime() : nowMs;
  if (Number.isNaN(end)) return 0;
  return Math.max(0, end - start);
}

export function msToHours(ms: number): number {
  return ms / 3_600_000;
}

export function formatHours(hours: number, digits = 2): string {
  return hours.toFixed(digits);
}

export function formatDurationShort(ms: number): string {
  const totalMin = Math.round(ms / 60_000);
  const h = Math.floor(totalMin / 60);
  const m = totalMin % 60;
  if (h <= 0) return `${m}m`;
  if (m === 0) return `${h}h`;
  return `${h}h ${m}m`;
}

/** Monday 00:00:00 local. */
export function startOfWeek(date = new Date()): Date {
  const d = new Date(date);
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

export function endOfWeek(weekStart: Date): Date {
  const d = new Date(weekStart);
  d.setDate(d.getDate() + 7);
  d.setMilliseconds(-1);
  return d;
}

export function periodForPreset(preset: import("@/lib/bossMan/timeTrackingTypes").PayPeriodPreset): {
  start: Date;
  end: Date;
  label: string;
} {
  const now = new Date();
  if (preset === "this_week") {
    const start = startOfWeek(now);
    return { start, end: now, label: "This week (Mon–today)" };
  }
  if (preset === "last_week") {
    const thisStart = startOfWeek(now);
    const start = new Date(thisStart);
    start.setDate(start.getDate() - 7);
    const end = new Date(thisStart);
    end.setMilliseconds(-1);
    return { start, end, label: "Last week" };
  }
  const end = new Date(now);
  const start = new Date(now);
  start.setDate(start.getDate() - 13);
  start.setHours(0, 0, 0, 0);
  return { start, end, label: "Last 14 days" };
}

export function entryOverlapsPeriod(entry: TimeEntry, start: Date, end: Date): boolean {
  const entryStart = new Date(entry.clockIn).getTime();
  const entryEnd = entry.clockOut ? new Date(entry.clockOut).getTime() : Date.now();
  if (Number.isNaN(entryStart)) return false;
  const rangeStart = start.getTime();
  const rangeEnd = end.getTime();
  return entryStart <= rangeEnd && entryEnd >= rangeStart;
}

export function isoWeekKey(isoDate: string): string {
  const d = startOfWeek(new Date(isoDate));
  return d.toISOString().slice(0, 10);
}

export function formatClockRange(entry: TimeEntry): string {
  const inDate = new Date(entry.clockIn);
  const outDate = entry.clockOut ? new Date(entry.clockOut) : null;
  const inStr = inDate.toLocaleString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
  if (!outDate) return `${inStr} → (clocked in)`;
  const outStr = outDate.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
  return `${inStr} – ${outStr}`;
}
