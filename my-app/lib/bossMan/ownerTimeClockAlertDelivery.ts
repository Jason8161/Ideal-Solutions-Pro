import { isEmployeeSessionActive } from "@/lib/employeeSession";
import {
  loadUnreadOwnerTimeClockAlerts,
  markOwnerTimeClockAlertRead,
} from "@/lib/bossMan/ownerTimeClockAlerts";
import { scheduleOwnerTimeClockLocalNotification } from "@/lib/bossMan/timeClockNotifications";
import type { OwnerTimeClockAlert } from "@/lib/bossMan/timeTrackingTypes";

const DELIVERED_NOTIFICATION_IDS_KEY = "ideal_owner_time_clock_notified_ids_v1";

let deliveredIdsCache: Set<string> | null = null;

function sessionDeliveredKey(): string {
  return DELIVERED_NOTIFICATION_IDS_KEY;
}

async function loadDeliveredIds(): Promise<Set<string>> {
  if (deliveredIdsCache) return deliveredIdsCache;
  try {
    const { default: AsyncStorage } = await import("@react-native-async-storage/async-storage");
    const raw = await AsyncStorage.getItem(sessionDeliveredKey());
    if (!raw) {
      deliveredIdsCache = new Set();
      return deliveredIdsCache;
    }
    const parsed = JSON.parse(raw) as unknown;
    deliveredIdsCache = new Set(Array.isArray(parsed) ? parsed.filter((id) => typeof id === "string") : []);
    return deliveredIdsCache;
  } catch {
    deliveredIdsCache = new Set();
    return deliveredIdsCache;
  }
}

async function persistDeliveredId(id: string): Promise<void> {
  const set = await loadDeliveredIds();
  if (set.has(id)) return;
  set.add(id);
  const trimmed = [...set].slice(-120);
  deliveredIdsCache = new Set(trimmed);
  const { default: AsyncStorage } = await import("@react-native-async-storage/async-storage");
  await AsyncStorage.setItem(sessionDeliveredKey(), JSON.stringify(trimmed));
}

/**
 * When the owner opens the app (not in employee test session), deliver pending alerts:
 * local notifications for unread items not yet notified on this device.
 */
export async function deliverPendingOwnerTimeClockAlerts(): Promise<OwnerTimeClockAlert[]> {
  if (await isEmployeeSessionActive()) return [];

  const unread = await loadUnreadOwnerTimeClockAlerts();
  const delivered = await loadDeliveredIds();

  for (const alert of unread) {
    if (delivered.has(alert.id)) continue;
    await scheduleOwnerTimeClockLocalNotification(alert);
    await persistDeliveredId(alert.id);
  }

  return unread;
}

export async function dismissOwnerTimeClockAlert(id: string): Promise<void> {
  await markOwnerTimeClockAlertRead(id);
}
