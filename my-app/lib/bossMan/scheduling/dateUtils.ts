const DAY_MS = 24 * 60 * 60 * 1000;

export function dayKeyFromDate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function parseDayKey(key: string): Date | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(key.trim());
  if (!m) return null;
  const d = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
  d.setHours(0, 0, 0, 0);
  return d;
}

export function startOfToday(): Date {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

export function addDays(base: Date, days: number): Date {
  const d = new Date(base.getTime());
  d.setDate(d.getDate() + days);
  return d;
}

/** Inclusive last schedulable day (today + 27 days = 4 weeks). */
export function scheduleWindowEnd(): Date {
  return addDays(startOfToday(), 27);
}

export function isDayInScheduleWindow(dayKey: string): boolean {
  const d = parseDayKey(dayKey);
  if (!d) return false;
  const t0 = startOfToday().getTime();
  const end = scheduleWindowEnd().getTime();
  const t = d.getTime();
  return t >= t0 && t <= end;
}

export function formatDayLabel(dayKey: string): string {
  const d = parseDayKey(dayKey);
  if (!d) return dayKey;
  return d.toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" });
}

export function formatTime12h(hhmm: string): string {
  const m = /^(\d{1,2}):(\d{2})$/.exec(hhmm.trim());
  if (!m) return hhmm;
  let h = Number(m[1]);
  const min = m[2];
  const ampm = h >= 12 ? "PM" : "AM";
  h = h % 12;
  if (h === 0) h = 12;
  return `${h}:${min} ${ampm}`;
}

export function daysInRange(start: Date, count: number): string[] {
  const keys: string[] = [];
  for (let i = 0; i < count; i++) {
    keys.push(dayKeyFromDate(addDays(start, i)));
  }
  return keys;
}

export function weekStartSunday(d: Date): Date {
  const copy = new Date(d.getTime());
  copy.setHours(0, 0, 0, 0);
  copy.setDate(copy.getDate() - copy.getDay());
  return copy;
}

export function minutesBetweenTimes(start: string, end: string): number | null {
  const parse = (t: string) => {
    const m = /^(\d{1,2}):(\d{2})$/.exec(t.trim());
    if (!m) return null;
    return Number(m[1]) * 60 + Number(m[2]);
  };
  const a = parse(start);
  const b = parse(end);
  if (a == null || b == null || b <= a) return null;
  return b - a;
}

export function defaultStartTime(): string {
  return "08:00";
}

export function defaultEndTime(): string {
  return "17:00";
}

export function daySpanMs(count: number): number {
  return count * DAY_MS;
}
