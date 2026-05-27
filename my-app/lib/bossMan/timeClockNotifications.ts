import { Platform } from "react-native";

import { formatClockEventTime, formatClockLocationLine } from "@/lib/bossMan/clockLocationDisplay";
import { buildMapsUrlForCoords } from "@/lib/bossMan/clockLocationDisplay";
import type { OwnerTimeClockAlert } from "@/lib/bossMan/timeTrackingTypes";
import {
  getNotificationPermission,
  nativeNotificationsModuleAvailable,
  requestNotificationPermission,
} from "@/lib/appointmentNotifications";
import { loadMapsPreference } from "@/lib/mapsPreference";

type NotificationsModule = typeof import("expo-notifications");

let notificationsSingleton: NotificationsModule | null = null;
let notificationsLoad: Promise<NotificationsModule | null> | null = null;

async function getNotifications(): Promise<NotificationsModule | null> {
  if (!nativeNotificationsModuleAvailable()) return null;
  if (notificationsSingleton) return notificationsSingleton;
  if (!notificationsLoad) {
    notificationsLoad = import("expo-notifications").then((Notifications) => {
      notificationsSingleton = Notifications;
      return Notifications;
    });
  }
  return notificationsLoad;
}

async function ensureTimeClockChannel(Notifications: NotificationsModule): Promise<void> {
  if (Platform.OS !== "android") return;
  await Notifications.setNotificationChannelAsync("time_clock", {
    name: "Time clock",
    importance: Notifications.AndroidImportance.HIGH,
    vibrationPattern: [0, 200, 120, 200],
  });
}

function alertTitle(alert: OwnerTimeClockAlert): string {
  const verb = alert.kind === "clock_in" ? "clocked in" : "clocked out";
  return `${alert.employeeName} ${verb}`;
}

function alertBody(alert: OwnerTimeClockAlert): string {
  const time = formatClockEventTime(alert.at);
  const loc = formatClockLocationLine(alert.location);
  if (loc) return `${time} · ${loc}`;
  return time;
}

/**
 * Immediate local notification on the owner device (same phone as the app).
 * Cross-device push requires a backend — see docs in employee time clock summary.
 */
export async function scheduleOwnerTimeClockLocalNotification(
  alert: OwnerTimeClockAlert,
): Promise<string | null> {
  const Notifications = await getNotifications();
  if (!Notifications) return null;

  const permission = await getNotificationPermission();
  if (permission !== "granted") {
    const requested = await requestNotificationPermission();
    if (requested !== "granted") return null;
  }

  await ensureTimeClockChannel(Notifications);

  let mapsUrl: string | undefined;
  if (alert.location) {
    const pref = await loadMapsPreference();
    mapsUrl = buildMapsUrlForCoords(
      pref,
      alert.location.latitude,
      alert.location.longitude,
      formatClockLocationLine(alert.location) ?? undefined,
    );
  }

  return Notifications.scheduleNotificationAsync({
    content: {
      title: alertTitle(alert),
      body: alertBody(alert),
      data: {
        type: "time_clock",
        alertId: alert.id,
        entryId: alert.entryId,
        mapsUrl,
      },
      sound: true,
      ...(Platform.OS === "android" ? { channelId: "time_clock" } : {}),
    },
    trigger: null,
  });
}
