import fs from "fs/promises";
import path from "path";

import { isDatabaseReachable, pool } from "../db/pool";
import { requireAuth } from "../workspace/store";

const DATA_DIR = path.join(process.cwd(), "data");
const DATA_FILE = path.join(DATA_DIR, "clock-events.json");

export type StoredClockEvent = {
  id: string;
  companyId: string;
  localEventId: string;
  kind: string;
  localEmployeeId: string;
  localJobId?: string;
  deviceTimestamp: string;
  serverReceivedAt: string;
  deviceId: string;
  latitude?: number;
  longitude?: number;
  address?: string;
  accuracy?: number;
  jobsiteVerification?: unknown;
  shiftDurationMs?: number;
  notes?: string;
  jobCompletionStatus?: string;
  timeEntryId?: string;
  payload: unknown;
};

async function readJsonStore(): Promise<StoredClockEvent[]> {
  await fs.mkdir(DATA_DIR, { recursive: true });
  try {
    await fs.access(DATA_FILE);
  } catch {
    await fs.writeFile(DATA_FILE, "[]", "utf8");
  }
  const raw = await fs.readFile(DATA_FILE, "utf8");
  const parsed = JSON.parse(raw) as unknown;
  return Array.isArray(parsed) ? (parsed as StoredClockEvent[]) : [];
}

async function writeJsonStore(rows: StoredClockEvent[]): Promise<void> {
  await fs.mkdir(DATA_DIR, { recursive: true });
  await fs.writeFile(DATA_FILE, JSON.stringify(rows, null, 2), "utf8");
}

function str(v: unknown): string {
  return typeof v === "string" ? v.trim() : "";
}

function num(v: unknown): number | undefined {
  return typeof v === "number" && Number.isFinite(v) ? v : undefined;
}

export type IncomingClockEvent = {
  localEventId: string;
  kind: string;
  localEmployeeId: string;
  localJobId?: string;
  deviceTimestamp: string;
  deviceId: string;
  latitude?: number;
  longitude?: number;
  address?: string;
  accuracy?: number;
  jobsiteVerification?: unknown;
  shiftDurationMs?: number;
  notes?: string;
  jobCompletionStatus?: string;
  timeEntryId?: string;
  photoBase64?: string;
  photoKind?: string;
};

export type BatchSyncResult = {
  synced: { localEventId: string; serverReceivedAt: string }[];
  failed: { localEventId: string; error: string }[];
};

async function insertPg(companyId: string, event: IncomingClockEvent, receivedAt: string): Promise<void> {
  const client = await pool.connect();
  try {
    await client.query(
      `INSERT INTO clock_verification_events (
        company_id, local_event_id, kind, local_employee_id, local_job_id,
        device_timestamp, server_received_at, device_id,
        latitude, longitude, address, accuracy,
        jobsite_verification, shift_duration_ms, notes, job_completion_status,
        time_entry_id, payload
      ) VALUES (
        $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18
      )
      ON CONFLICT (company_id, local_event_id) DO NOTHING`,
      [
        companyId,
        event.localEventId,
        event.kind,
        event.localEmployeeId,
        event.localJobId ?? null,
        event.deviceTimestamp,
        receivedAt,
        event.deviceId,
        event.latitude ?? null,
        event.longitude ?? null,
        event.address ?? null,
        event.accuracy ?? null,
        event.jobsiteVerification ? JSON.stringify(event.jobsiteVerification) : null,
        event.shiftDurationMs ?? null,
        event.notes ?? null,
        event.jobCompletionStatus ?? null,
        event.timeEntryId ?? null,
        JSON.stringify({
          photoKind: event.photoKind,
          hasPhoto: Boolean(event.photoBase64),
        }),
      ],
    );
  } finally {
    client.release();
  }
}

async function insertJson(companyId: string, event: IncomingClockEvent, receivedAt: string): Promise<void> {
  const rows = await readJsonStore();
  if (rows.some((r) => r.companyId === companyId && r.localEventId === event.localEventId)) {
    return;
  }
  rows.push({
    id: `ce_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    companyId,
    localEventId: event.localEventId,
    kind: event.kind,
    localEmployeeId: event.localEmployeeId,
    localJobId: event.localJobId,
    deviceTimestamp: event.deviceTimestamp,
    serverReceivedAt: receivedAt,
    deviceId: event.deviceId,
    latitude: event.latitude,
    longitude: event.longitude,
    address: event.address,
    accuracy: event.accuracy,
    jobsiteVerification: event.jobsiteVerification,
    shiftDurationMs: event.shiftDurationMs,
    notes: event.notes,
    jobCompletionStatus: event.jobCompletionStatus,
    timeEntryId: event.timeEntryId,
    payload: {
      photoKind: event.photoKind,
      hasPhoto: Boolean(event.photoBase64),
    },
  });
  await writeJsonStore(rows);
}

function normalizeIncoming(raw: unknown): IncomingClockEvent | null {
  if (typeof raw !== "object" || raw === null) return null;
  const row = raw as Partial<IncomingClockEvent>;
  const localEventId = str(row.localEventId);
  const kind = str(row.kind);
  const localEmployeeId = str(row.localEmployeeId);
  const deviceTimestamp = str(row.deviceTimestamp);
  const deviceId = str(row.deviceId);
  if (!localEventId || !kind || !localEmployeeId || !deviceTimestamp || !deviceId) return null;
  return {
    localEventId,
    kind,
    localEmployeeId,
    localJobId: str(row.localJobId) || undefined,
    deviceTimestamp,
    deviceId,
    latitude: num(row.latitude),
    longitude: num(row.longitude),
    address: str(row.address) || undefined,
    accuracy: num(row.accuracy),
    jobsiteVerification: row.jobsiteVerification,
    shiftDurationMs: num(row.shiftDurationMs),
    notes: str(row.notes) || undefined,
    jobCompletionStatus: str(row.jobCompletionStatus) || undefined,
    timeEntryId: str(row.timeEntryId) || undefined,
    photoBase64: str(row.photoBase64) || undefined,
    photoKind: str(row.photoKind) || undefined,
  };
}

export async function batchSyncClockEvents(
  authorization: string | undefined,
  eventsRaw: unknown[],
): Promise<BatchSyncResult> {
  const auth = await requireAuth(authorization);
  const companyId = auth.company.id;
  const synced: BatchSyncResult["synced"] = [];
  const failed: BatchSyncResult["failed"] = [];
  const usePg = await isDatabaseReachable();

  for (const raw of eventsRaw) {
    const event = normalizeIncoming(raw);
    if (!event) {
      failed.push({ localEventId: "unknown", error: "Invalid event payload" });
      continue;
    }
    const receivedAt = new Date().toISOString();
    try {
      if (usePg) {
        await insertPg(companyId, event, receivedAt);
      } else {
        await insertJson(companyId, event, receivedAt);
      }
      synced.push({ localEventId: event.localEventId, serverReceivedAt: receivedAt });
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Store failed";
      failed.push({ localEventId: event.localEventId, error: msg });
    }
  }

  return { synced, failed };
}
