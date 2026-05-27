import AsyncStorage from "@react-native-async-storage/async-storage";

import type { OwnerTimeClockAlert, TimeClockEventKind } from "@/lib/bossMan/timeTrackingTypes";
import type { ClockLocation } from "@/lib/bossMan/timeTrackingTypes";

export const OWNER_TIME_CLOCK_ALERTS_KEY = "ideal_solutions_owner_time_clock_alerts_v1";

const MAX_ALERTS = 80;

function newAlertId(): string {
  return `tca_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

function normalizeAlert(raw: unknown): OwnerTimeClockAlert | null {
  if (typeof raw !== "object" || raw === null) return null;
  const row = raw as Partial<OwnerTimeClockAlert>;
  const kind: TimeClockEventKind | null =
    row.kind === "clock_in" || row.kind === "clock_out" ? row.kind : null;
  if (
    !kind ||
    typeof row.id !== "string" ||
    typeof row.employeeId !== "string" ||
    typeof row.employeeName !== "string" ||
    typeof row.entryId !== "string" ||
    typeof row.at !== "string"
  ) {
    return null;
  }
  const createdAt = typeof row.createdAt === "string" ? row.createdAt : row.at;
  let location: ClockLocation | undefined;
  if (typeof row.location === "object" && row.location !== null) {
    const loc = row.location as Partial<ClockLocation>;
    if (typeof loc.latitude === "number" && typeof loc.longitude === "number") {
      location = {
        latitude: loc.latitude,
        longitude: loc.longitude,
        address: typeof loc.address === "string" ? loc.address : undefined,
        accuracy: typeof loc.accuracy === "number" ? loc.accuracy : undefined,
        capturedAt: typeof loc.capturedAt === "string" ? loc.capturedAt : createdAt,
      };
    }
  }
  return {
    id: row.id,
    kind,
    employeeId: row.employeeId,
    employeeName: row.employeeName,
    entryId: row.entryId,
    at: row.at,
    location,
    read: row.read === true,
    createdAt,
  };
}

async function loadAll(): Promise<OwnerTimeClockAlert[]> {
  try {
    const raw = await AsyncStorage.getItem(OWNER_TIME_CLOCK_ALERTS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.map(normalizeAlert).filter((a): a is OwnerTimeClockAlert => a !== null);
  } catch {
    return [];
  }
}

async function saveAll(alerts: OwnerTimeClockAlert[]): Promise<void> {
  const trimmed = alerts
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .slice(0, MAX_ALERTS);
  await AsyncStorage.setItem(OWNER_TIME_CLOCK_ALERTS_KEY, JSON.stringify(trimmed));
}

export async function loadOwnerTimeClockAlerts(): Promise<OwnerTimeClockAlert[]> {
  return loadAll();
}

export async function loadUnreadOwnerTimeClockAlerts(): Promise<OwnerTimeClockAlert[]> {
  const rows = await loadAll();
  return rows.filter((a) => !a.read).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export async function enqueueOwnerTimeClockAlert(input: {
  kind: TimeClockEventKind;
  employeeId: string;
  employeeName: string;
  entryId: string;
  at: string;
  location?: ClockLocation;
}): Promise<OwnerTimeClockAlert> {
  const alert: OwnerTimeClockAlert = {
    id: newAlertId(),
    kind: input.kind,
    employeeId: input.employeeId,
    employeeName: input.employeeName,
    entryId: input.entryId,
    at: input.at,
    location: input.location,
    read: false,
    createdAt: new Date().toISOString(),
  };
  const rows = await loadAll();
  rows.unshift(alert);
  await saveAll(rows);
  return alert;
}

export async function markOwnerTimeClockAlertRead(id: string): Promise<void> {
  const rows = await loadAll();
  const idx = rows.findIndex((a) => a.id === id);
  if (idx < 0) return;
  rows[idx] = { ...rows[idx], read: true };
  await saveAll(rows);
}

export async function markAllOwnerTimeClockAlertsRead(): Promise<void> {
  const rows = await loadAll();
  if (!rows.some((a) => !a.read)) return;
  await saveAll(rows.map((a) => ({ ...a, read: true })));
}

export async function clearOwnerTimeClockAlerts(): Promise<void> {
  await AsyncStorage.removeItem(OWNER_TIME_CLOCK_ALERTS_KEY);
}
