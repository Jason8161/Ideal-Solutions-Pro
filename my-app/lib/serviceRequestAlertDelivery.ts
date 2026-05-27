import AsyncStorage from "@react-native-async-storage/async-storage";

import { isEmployeeSessionActive } from "@/lib/employeeSession";
import { isRemoteServiceRequestHandled } from "@/lib/serviceRequestInboxState";
import { scheduleServiceRequestLocalNotification } from "@/lib/serviceRequestNotifications";
import type { RemoteServiceRequest } from "@/lib/serviceRequestApi";

const NOTIFIED_REMOTE_IDS_KEY = "ideal_service_request_notified_ids_v1";

let notifiedIdsCache: Set<string> | null = null;

async function loadNotifiedIds(): Promise<Set<string>> {
  if (notifiedIdsCache) return notifiedIdsCache;
  try {
    const raw = await AsyncStorage.getItem(NOTIFIED_REMOTE_IDS_KEY);
    if (!raw) {
      notifiedIdsCache = new Set();
      return notifiedIdsCache;
    }
    const parsed = JSON.parse(raw) as unknown;
    notifiedIdsCache = new Set(
      Array.isArray(parsed) ? parsed.filter((id): id is string => typeof id === "string") : [],
    );
    return notifiedIdsCache;
  } catch {
    notifiedIdsCache = new Set();
    return notifiedIdsCache;
  }
}

async function persistNotifiedId(id: string): Promise<void> {
  const set = await loadNotifiedIds();
  if (set.has(id)) return;
  set.add(id);
  const trimmed = [...set].slice(-200);
  notifiedIdsCache = new Set(trimmed);
  await AsyncStorage.setItem(NOTIFIED_REMOTE_IDS_KEY, JSON.stringify(trimmed));
}

/**
 * Notify the contractor (boss/owner device) for newly imported customer requests.
 * Skips employee test sessions and already-notified remote IDs.
 */
export async function notifyForImportedServiceRequests(
  requests: RemoteServiceRequest[],
): Promise<void> {
  if (requests.length === 0) return;
  if (await isEmployeeSessionActive()) return;

  const notified = await loadNotifiedIds();
  for (const req of requests) {
    if (!req.id?.trim() || notified.has(req.id)) continue;
    if (await isRemoteServiceRequestHandled(req.id)) continue;
    await scheduleServiceRequestLocalNotification(req);
    await persistNotifiedId(req.id);
  }
}
