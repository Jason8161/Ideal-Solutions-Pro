import AsyncStorage from "@react-native-async-storage/async-storage";

const STORAGE_KEY = "ideal_solutions_appointments_v1";

export type ReminderOption = {
  label: string;
  minutes: number | null;
};

export const REMINDER_OPTIONS: ReminderOption[] = [
  { label: "None", minutes: null },
  { label: "15 min before", minutes: 15 },
  { label: "30 min before", minutes: 30 },
  { label: "1 hour before", minutes: 60 },
  { label: "2 hours before", minutes: 120 },
  { label: "1 day before", minutes: 1440 },
];

export type AppointmentRecord = {
  id: string;
  title: string;
  startISO: string;
  endISO: string;
  notes: string;
  reminderMinutesBefore: number | null;
  notificationId: string | null;
  createdAt: string;
  updatedAt: string;
};

function newId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;
}

function isAppointmentRecord(row: unknown): row is AppointmentRecord {
  if (typeof row !== "object" || row === null) return false;
  const r = row as AppointmentRecord;
  return (
    typeof r.id === "string" &&
    typeof r.title === "string" &&
    typeof r.startISO === "string" &&
    typeof r.endISO === "string" &&
    typeof r.notes === "string" &&
    (r.reminderMinutesBefore === null || typeof r.reminderMinutesBefore === "number") &&
    (r.notificationId === null || typeof r.notificationId === "string") &&
    typeof r.createdAt === "string" &&
    typeof r.updatedAt === "string"
  );
}

async function loadAll(): Promise<AppointmentRecord[]> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(isAppointmentRecord);
  } catch {
    return [];
  }
}

async function saveAll(records: AppointmentRecord[]): Promise<void> {
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(records));
}

export function dayKeyFromDate(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

/** `true` when `key` is a calendar date in `YYYY-MM-DD` form. */
export function isValidScheduleDayKey(key: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(key.trim());
}

export function parseDayKey(key: string): Date {
  const [y, m, d] = key.split("-").map(Number);
  return new Date(y, (m ?? 1) - 1, d ?? 1);
}

export function sameCalendarDay(a: Date, b: Date): boolean {
  return dayKeyFromDate(a) === dayKeyFromDate(b);
}

export function appointmentDayKey(record: AppointmentRecord): string {
  return dayKeyFromDate(new Date(record.startISO));
}

export function buildISOFromDayAndTime(dayKey: string, timeHHMM: string): string | null {
  const match = /^(\d{1,2}):(\d{2})$/.exec(timeHHMM.trim());
  if (!match) return null;
  const hours = Number(match[1]);
  const minutes = Number(match[2]);
  if (hours < 0 || hours > 23 || minutes < 0 || minutes > 59) return null;
  const base = parseDayKey(dayKey);
  base.setHours(hours, minutes, 0, 0);
  return base.toISOString();
}

export function formatTimeFromISO(iso: string): string {
  try {
    const d = new Date(iso);
    const h = String(d.getHours()).padStart(2, "0");
    const m = String(d.getMinutes()).padStart(2, "0");
    return `${h}:${m}`;
  } catch {
    return "09:00";
  }
}

export function formatAppointmentDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString(undefined, {
      weekday: "short",
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  } catch {
    return iso;
  }
}

export function formatAppointmentTimeRange(startISO: string, endISO: string): string {
  try {
    const start = new Date(startISO);
    const end = new Date(endISO);
    const opts: Intl.DateTimeFormatOptions = { hour: "numeric", minute: "2-digit" };
    return `${start.toLocaleTimeString(undefined, opts)} – ${end.toLocaleTimeString(undefined, opts)}`;
  } catch {
    return "";
  }
}

export function reminderLabel(minutes: number | null): string {
  if (minutes === null) return "No reminder";
  const found = REMINDER_OPTIONS.find((o) => o.minutes === minutes);
  return found?.label ?? `${minutes} min before`;
}

export async function loadAppointments(): Promise<AppointmentRecord[]> {
  const rows = await loadAll();
  return rows.sort((a, b) => a.startISO.localeCompare(b.startISO));
}

export async function getAppointmentById(id: string): Promise<AppointmentRecord | null> {
  const rows = await loadAll();
  return rows.find((r) => r.id === id) ?? null;
}

export async function appointmentsForDay(dayKey: string): Promise<AppointmentRecord[]> {
  const rows = await loadAppointments();
  return rows.filter((r) => appointmentDayKey(r) === dayKey);
}

export type AppointmentInput = {
  title: string;
  startISO: string;
  endISO: string;
  notes: string;
  reminderMinutesBefore: number | null;
  notificationId: string | null;
};

export async function addAppointment(input: AppointmentInput): Promise<AppointmentRecord> {
  const now = new Date().toISOString();
  const record: AppointmentRecord = {
    id: newId(),
    title: input.title.trim() || "Appointment",
    startISO: input.startISO,
    endISO: input.endISO,
    notes: input.notes.trim(),
    reminderMinutesBefore: input.reminderMinutesBefore,
    notificationId: input.notificationId,
    createdAt: now,
    updatedAt: now,
  };
  const rows = await loadAll();
  rows.push(record);
  await saveAll(rows);
  return record;
}

export async function updateAppointment(
  id: string,
  input: AppointmentInput,
): Promise<AppointmentRecord | null> {
  const rows = await loadAll();
  const idx = rows.findIndex((r) => r.id === id);
  if (idx < 0) return null;
  const updated: AppointmentRecord = {
    ...rows[idx],
    title: input.title.trim() || "Appointment",
    startISO: input.startISO,
    endISO: input.endISO,
    notes: input.notes.trim(),
    reminderMinutesBefore: input.reminderMinutesBefore,
    notificationId: input.notificationId,
    updatedAt: new Date().toISOString(),
  };
  rows[idx] = updated;
  await saveAll(rows);
  return updated;
}

export async function deleteAppointment(id: string): Promise<AppointmentRecord | null> {
  const rows = await loadAll();
  const found = rows.find((r) => r.id === id) ?? null;
  const next = rows.filter((r) => r.id !== id);
  if (next.length === rows.length) return null;
  await saveAll(next);
  return found;
}

export function daysWithAppointments(records: AppointmentRecord[]): Set<string> {
  return new Set(records.map(appointmentDayKey));
}
