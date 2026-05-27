import { readAsStringAsync } from "expo-file-system/legacy";

import { loadBossCloudSession } from "@/lib/cloud/bossSession";
import { hasCloudApi } from "@/lib/cloud/client";
import { loadEmployeeSession } from "@/lib/employeeSession";
import { getPricingApiBaseUrl } from "@/lib/pricingApiUrl";

import {
  loadPendingClockEvents,
  markClockEventsFailed,
  markClockEventsSynced,
} from "./clockEventStorage";
import type { ClockEvent, ClockEventSyncBatchResult, ClockEventSyncPayload } from "./types";

async function resolveAuthToken(): Promise<string | null> {
  const boss = await loadBossCloudSession();
  if (boss?.bossToken) return boss.bossToken;
  const emp = await loadEmployeeSession();
  if (emp.cloudAuthToken) return emp.cloudAuthToken;
  return null;
}

async function readPhotoBase64(uri?: string): Promise<string | undefined> {
  if (!uri?.trim()) return undefined;
  try {
    const base64 = await readAsStringAsync(uri, { encoding: "base64" });
    return base64.length > 0 ? base64 : undefined;
  } catch {
    return undefined;
  }
}

function toSyncPayload(event: ClockEvent, photoBase64?: string): ClockEventSyncPayload {
  return {
    localEventId: event.id,
    kind: event.kind,
    localEmployeeId: event.employeeId,
    localJobId: event.jobsiteId,
    deviceTimestamp: event.timestamp,
    deviceId: event.deviceId,
    latitude: event.location?.latitude,
    longitude: event.location?.longitude,
    address: event.location?.address,
    accuracy: event.location?.accuracy,
    jobsiteVerification: event.jobsiteVerification,
    shiftDurationMs: event.shiftDurationMs,
    notes: event.notes,
    jobCompletionStatus: event.jobCompletionStatus,
    timeEntryId: event.timeEntryId,
    photoBase64,
    photoKind: event.photo?.kind,
  };
}

export async function probeNetworkOnline(): Promise<boolean> {
  const base = getPricingApiBaseUrl();
  if (!base) return false;
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 4000);
    const res = await fetch(`${base.replace(/\/+$/, "")}/health`, {
      method: "GET",
      signal: controller.signal,
    });
    clearTimeout(timer);
    return res.ok;
  } catch {
    return false;
  }
}

export async function syncPendingClockEvents(): Promise<ClockEventSyncBatchResult> {
  const empty: ClockEventSyncBatchResult = { synced: [], failed: [] };
  if (!hasCloudApi()) return empty;

  const authToken = await resolveAuthToken();
  if (!authToken) return empty;

  const pending = await loadPendingClockEvents();
  if (pending.length === 0) return empty;

  const base = getPricingApiBaseUrl();
  if (!base) return empty;

  const payloads: ClockEventSyncPayload[] = [];
  for (const event of pending) {
    const photoBase64 = await readPhotoBase64(event.photo?.localUri);
    payloads.push(toSyncPayload(event, photoBase64));
  }

  try {
    const res = await fetch(`${base.replace(/\/+$/, "")}/api/clock-events/batch`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${authToken}`,
      },
      body: JSON.stringify({ events: payloads }),
    });

    const json = (await res.json()) as {
      ok?: boolean;
      synced?: { localEventId: string; serverReceivedAt?: string }[];
      failed?: { localEventId: string; error: string }[];
      error?: string;
    };

    if (!res.ok || json.ok === false) {
      const ids = pending.map((e) => e.id);
      await markClockEventsFailed(ids);
      return {
        synced: [],
        failed: ids.map((id) => ({ localEventId: id, error: json.error ?? "Sync failed" })),
      };
    }

    const syncedRows = json.synced ?? [];
    await markClockEventsSynced(
      syncedRows.map((row) => ({
        id: row.localEventId,
        serverReceivedAt: row.serverReceivedAt,
      })),
    );

    const failedRows = json.failed ?? [];
    if (failedRows.length > 0) {
      await markClockEventsFailed(failedRows.map((f) => f.localEventId));
    }

    return {
      synced: syncedRows.map((s) => s.localEventId),
      failed: failedRows,
    };
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Network error";
    return {
      synced: [],
      failed: pending.map((ev) => ({ localEventId: ev.id, error: msg })),
    };
  }
}

/** Fire-and-forget background sync after a punch. */
export function scheduleClockEventSync(): void {
  void syncPendingClockEvents();
}
