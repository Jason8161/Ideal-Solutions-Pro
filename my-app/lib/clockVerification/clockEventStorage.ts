import AsyncStorage from "@react-native-async-storage/async-storage";

import type { ClockEvent, ClockEventSyncStatus } from "./types";

const QUEUE_KEY = "ideal_clock_events_queue_v1";
const HISTORY_KEY = "ideal_clock_events_history_v1";

function newId(): string {
  return `ce_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

function normalizeEvent(raw: unknown): ClockEvent | null {
  if (typeof raw !== "object" || raw === null) return null;
  const row = raw as Partial<ClockEvent>;
  if (
    typeof row.id !== "string" ||
    typeof row.kind !== "string" ||
    typeof row.employeeId !== "string" ||
    typeof row.deviceId !== "string" ||
    typeof row.timestamp !== "string"
  ) {
    return null;
  }
  const syncStatus: ClockEventSyncStatus =
    row.syncStatus === "synced" || row.syncStatus === "failed" ? row.syncStatus : "pending_sync";
  return {
    id: row.id,
    kind: row.kind as ClockEvent["kind"],
    employeeId: row.employeeId,
    deviceId: row.deviceId,
    timestamp: row.timestamp,
    location: row.location,
    jobsiteId: typeof row.jobsiteId === "string" ? row.jobsiteId : undefined,
    jobsiteName: typeof row.jobsiteName === "string" ? row.jobsiteName : undefined,
    jobsiteVerification: row.jobsiteVerification,
    timeEntryId: typeof row.timeEntryId === "string" ? row.timeEntryId : undefined,
    shiftDurationMs: typeof row.shiftDurationMs === "number" ? row.shiftDurationMs : undefined,
    notes: typeof row.notes === "string" ? row.notes : undefined,
    jobCompletionStatus: row.jobCompletionStatus,
    photo: row.photo,
    syncStatus,
    syncedAt: typeof row.syncedAt === "string" ? row.syncedAt : undefined,
    serverReceivedAt:
      typeof row.serverReceivedAt === "string" ? row.serverReceivedAt : undefined,
    createdAt: typeof row.createdAt === "string" ? row.createdAt : row.timestamp,
    updatedAt: typeof row.updatedAt === "string" ? row.updatedAt : row.timestamp,
  };
}

async function readJson(key: string): Promise<ClockEvent[]> {
  try {
    const raw = await AsyncStorage.getItem(key);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.map(normalizeEvent).filter((e): e is ClockEvent => e !== null);
  } catch {
    return [];
  }
}

async function writeJson(key: string, events: ClockEvent[]): Promise<void> {
  await AsyncStorage.setItem(key, JSON.stringify(events));
}

export async function loadPendingClockEvents(): Promise<ClockEvent[]> {
  return readJson(QUEUE_KEY);
}

export async function loadClockEventHistory(): Promise<ClockEvent[]> {
  const history = await readJson(HISTORY_KEY);
  const pending = await readJson(QUEUE_KEY);
  return [...history, ...pending].sort((a, b) => b.timestamp.localeCompare(a.timestamp));
}

export async function getLastClockEventForEmployee(employeeId: string): Promise<ClockEvent | null> {
  const rows = await loadClockEventHistory();
  return rows.find((e) => e.employeeId === employeeId) ?? null;
}

export async function saveClockEvent(event: ClockEvent): Promise<ClockEvent> {
  const now = new Date().toISOString();
  const normalized: ClockEvent = {
    ...event,
    createdAt: event.createdAt ?? now,
    updatedAt: now,
  };

  if (normalized.syncStatus === "pending_sync") {
    const queue = await readJson(QUEUE_KEY);
    const idx = queue.findIndex((e) => e.id === normalized.id);
    if (idx >= 0) queue[idx] = normalized;
    else queue.push(normalized);
    await writeJson(QUEUE_KEY, queue);
  } else {
    const history = await readJson(HISTORY_KEY);
    const idx = history.findIndex((e) => e.id === normalized.id);
    if (idx >= 0) history[idx] = normalized;
    else history.push(normalized);
    await writeJson(HISTORY_KEY, history);
    const queue = await readJson(QUEUE_KEY);
    await writeJson(
      QUEUE_KEY,
      queue.filter((e) => e.id !== normalized.id),
    );
  }

  return normalized;
}

export async function enqueueClockEvent(
  input: Omit<ClockEvent, "id" | "createdAt" | "updatedAt" | "syncStatus"> & {
    id?: string;
    syncStatus?: ClockEventSyncStatus;
  },
): Promise<ClockEvent> {
  const now = new Date().toISOString();
  const event: ClockEvent = {
    id: input.id ?? newId(),
    kind: input.kind,
    employeeId: input.employeeId,
    deviceId: input.deviceId,
    timestamp: input.timestamp,
    location: input.location,
    jobsiteId: input.jobsiteId,
    jobsiteName: input.jobsiteName,
    jobsiteVerification: input.jobsiteVerification,
    timeEntryId: input.timeEntryId,
    shiftDurationMs: input.shiftDurationMs,
    notes: input.notes,
    jobCompletionStatus: input.jobCompletionStatus,
    photo: input.photo,
    syncStatus: input.syncStatus ?? "pending_sync",
    syncedAt: input.syncedAt,
    serverReceivedAt: input.serverReceivedAt,
    createdAt: now,
    updatedAt: now,
  };
  return saveClockEvent(event);
}

export async function markClockEventsSynced(
  updates: { id: string; serverReceivedAt?: string }[],
): Promise<void> {
  const queue = await readJson(QUEUE_KEY);
  const history = await readJson(HISTORY_KEY);
  const now = new Date().toISOString();
  const syncedIds = new Set(updates.map((u) => u.id));
  const receivedMap = new Map(updates.map((u) => [u.id, u.serverReceivedAt]));

  const moved: ClockEvent[] = [];
  const remaining: ClockEvent[] = [];

  for (const event of queue) {
    if (syncedIds.has(event.id)) {
      moved.push({
        ...event,
        syncStatus: "synced",
        syncedAt: now,
        serverReceivedAt: receivedMap.get(event.id) ?? now,
        updatedAt: now,
      });
    } else {
      remaining.push(event);
    }
  }

  if (moved.length > 0) {
    for (const event of moved) {
      const idx = history.findIndex((e) => e.id === event.id);
      if (idx >= 0) history[idx] = event;
      else history.push(event);
    }
    await writeJson(HISTORY_KEY, history);
  }
  await writeJson(QUEUE_KEY, remaining);
}

export async function markClockEventsFailed(ids: string[]): Promise<void> {
  const queue = await readJson(QUEUE_KEY);
  const idSet = new Set(ids);
  const now = new Date().toISOString();
  await writeJson(
    QUEUE_KEY,
    queue.map((e) => (idSet.has(e.id) ? { ...e, syncStatus: "failed" as const, updatedAt: now } : e)),
  );
}

export async function countPendingClockEvents(): Promise<number> {
  return (await readJson(QUEUE_KEY)).length;
}
