import AsyncStorage from "@react-native-async-storage/async-storage";

import type { ClockLocation, TimeEntry, TimeEntrySource } from "@/lib/bossMan/timeTrackingTypes";

export const BOSS_TIME_ENTRIES_STORAGE_KEY = "ideal_solutions_boss_time_entries_v1";

function newId(): string {
  return `te_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

function normalizeClockLocation(raw: unknown): ClockLocation | undefined {
  if (typeof raw !== "object" || raw === null) return undefined;
  const loc = raw as Partial<ClockLocation>;
  if (typeof loc.latitude !== "number" || typeof loc.longitude !== "number") return undefined;
  const capturedAt =
    typeof loc.capturedAt === "string" ? loc.capturedAt : new Date().toISOString();
  return {
    latitude: loc.latitude,
    longitude: loc.longitude,
    address: typeof loc.address === "string" ? loc.address : undefined,
    accuracy: typeof loc.accuracy === "number" ? loc.accuracy : undefined,
    capturedAt,
  };
}

function normalizeEntry(raw: unknown): TimeEntry | null {
  if (typeof raw !== "object" || raw === null) return null;
  const row = raw as Partial<TimeEntry>;
  if (typeof row.id !== "string" || typeof row.employeeId !== "string" || typeof row.clockIn !== "string") {
    return null;
  }
  const source: TimeEntrySource = row.source === "manual" ? "manual" : "clock";
  const createdAt = typeof row.createdAt === "string" ? row.createdAt : row.clockIn;
  const updatedAt = typeof row.updatedAt === "string" ? row.updatedAt : createdAt;
  return {
    id: row.id,
    employeeId: row.employeeId,
    jobId: typeof row.jobId === "string" ? row.jobId : undefined,
    clockIn: row.clockIn,
    clockOut: typeof row.clockOut === "string" ? row.clockOut : undefined,
    clockInLocation: normalizeClockLocation(row.clockInLocation),
    clockOutLocation: normalizeClockLocation(row.clockOutLocation),
    notes: typeof row.notes === "string" ? row.notes : undefined,
    source,
    createdAt,
    updatedAt,
  };
}

async function loadAll(): Promise<TimeEntry[]> {
  try {
    const raw = await AsyncStorage.getItem(BOSS_TIME_ENTRIES_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.map(normalizeEntry).filter((e): e is TimeEntry => e !== null);
  } catch {
    return [];
  }
}

async function saveAll(entries: TimeEntry[]): Promise<void> {
  await AsyncStorage.setItem(BOSS_TIME_ENTRIES_STORAGE_KEY, JSON.stringify(entries));
}

export async function loadTimeEntries(): Promise<TimeEntry[]> {
  const rows = await loadAll();
  return rows.sort((a, b) => b.clockIn.localeCompare(a.clockIn));
}

export async function getTimeEntryById(id: string): Promise<TimeEntry | null> {
  const rows = await loadAll();
  return rows.find((e) => e.id === id) ?? null;
}

export async function loadActiveTimeEntries(): Promise<TimeEntry[]> {
  const rows = await loadAll();
  return rows.filter((e) => !e.clockOut).sort((a, b) => b.clockIn.localeCompare(a.clockIn));
}

export async function getActiveEntryForEmployee(employeeId: string): Promise<TimeEntry | null> {
  const rows = await loadActiveTimeEntries();
  return rows.find((e) => e.employeeId === employeeId) ?? null;
}

export type ClockInOptions = {
  jobId?: string;
  clockInLocation?: ClockLocation;
};

export type ClockOutOptions = {
  clockOutLocation?: ClockLocation;
};

export async function clockIn(employeeId: string, options?: string | ClockInOptions): Promise<TimeEntry> {
  const opts: ClockInOptions =
    typeof options === "string" ? { jobId: options } : (options ?? {});
  const existing = await getActiveEntryForEmployee(employeeId);
  if (existing) {
    throw new Error("This employee is already clocked in. Clock them out first.");
  }

  const now = new Date().toISOString();
  const entry: TimeEntry = {
    id: newId(),
    employeeId,
    jobId: opts.jobId?.trim() || undefined,
    clockIn: now,
    clockInLocation: opts.clockInLocation,
    source: "clock",
    createdAt: now,
    updatedAt: now,
  };

  const rows = await loadAll();
  rows.push(entry);
  await saveAll(rows);
  return entry;
}

export async function clockOut(entryId: string, options?: ClockOutOptions): Promise<TimeEntry> {
  const rows = await loadAll();
  const idx = rows.findIndex((e) => e.id === entryId);
  if (idx < 0) throw new Error("Time entry not found");
  if (rows[idx].clockOut) throw new Error("Already clocked out");

  const now = new Date().toISOString();
  const updated: TimeEntry = {
    ...rows[idx],
    clockOut: now,
    clockOutLocation: options?.clockOutLocation ?? rows[idx].clockOutLocation,
    updatedAt: now,
  };
  rows[idx] = updated;
  await saveAll(rows);
  return updated;
}

export async function createManualTimeEntry(input: {
  employeeId: string;
  jobId?: string;
  workDate: string;
  hours: number;
  notes?: string;
}): Promise<TimeEntry> {
  if (!input.hours || input.hours <= 0) {
    throw new Error("Enter hours greater than zero.");
  }

  const [y, m, d] = input.workDate.split("-").map((n) => parseInt(n, 10));
  if (!y || !m || !d) throw new Error("Use date format YYYY-MM-DD.");

  const start = new Date(y, m - 1, d, 7, 0, 0, 0);
  const end = new Date(start.getTime() + input.hours * 3_600_000);
  const now = new Date().toISOString();

  const entry: TimeEntry = {
    id: newId(),
    employeeId: input.employeeId,
    jobId: input.jobId?.trim() || undefined,
    clockIn: start.toISOString(),
    clockOut: end.toISOString(),
    notes: input.notes?.trim() || undefined,
    source: "manual",
    createdAt: now,
    updatedAt: now,
  };

  const rows = await loadAll();
  rows.push(entry);
  await saveAll(rows);
  return entry;
}

export async function deleteTimeEntry(id: string): Promise<void> {
  const rows = await loadAll();
  await saveAll(rows.filter((e) => e.id !== id));
}
