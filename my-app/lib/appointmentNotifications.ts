import AsyncStorage from "@react-native-async-storage/async-storage";
import Constants from "expo-constants";
import { isRunningInExpoGo } from "expo";
import { Platform } from "react-native";

import { loadColorScheme } from "@/lib/colorSchemeStorage";
import type { AppointmentRecord } from "@/lib/appointmentStorage";
import { formatAppointmentTimeRange, reminderLabel } from "@/lib/appointmentStorage";

/**
 * `expo-notifications` prints a Metro console warning on every static import while
 * running in Expo Go (SDK 53+). Avoid loading the module there; use a dev build or
 * production binary for full notification support.
 */
type NotificationsModule = typeof import("expo-notifications");

let notificationsSingleton: NotificationsModule | null = null;
let notificationsLoad: Promise<NotificationsModule | null> | null = null;

async function getNotifications(): Promise<NotificationsModule | null> {
  if (isRunningInExpoGo()) return null;
  if (notificationsSingleton) return notificationsSingleton;
  if (!notificationsLoad) {
    notificationsLoad = import("expo-notifications").then((Notifications) => {
      Notifications.setNotificationHandler({
        handleNotification: async () => ({
          shouldShowAlert: true,
          shouldPlaySound: true,
          shouldSetBadge: false,
          shouldShowBanner: true,
          shouldShowList: true,
        }),
      });
      notificationsSingleton = Notifications;
      return Notifications;
    });
  }
  return notificationsLoad;
}

async function ensureAndroidNotificationChannels(Notifications: NotificationsModule): Promise<void> {
  if (Platform.OS !== "android") return;
  const { accent } = await loadColorScheme();
  await Notifications.setNotificationChannelAsync("appointments", {
    name: "Appointments",
    importance: Notifications.AndroidImportance.HIGH,
    vibrationPattern: [0, 250, 250, 250],
    lightColor: accent,
  });
  await Notifications.setNotificationChannelAsync("default", {
    name: "General",
    importance: Notifications.AndroidImportance.DEFAULT,
    vibrationPattern: [0, 250, 250, 250],
    lightColor: accent,
  });
}

export type NotificationPermissionState = "granted" | "denied" | "undetermined";

/** `false` in Expo Go (SDK 53+): use a dev build for full push + fewer console warnings. */
export function nativeNotificationsModuleAvailable(): boolean {
  return !isRunningInExpoGo();
}

export async function getNotificationPermission(): Promise<NotificationPermissionState> {
  const Notifications = await getNotifications();
  if (!Notifications) return "undetermined";
  const { status } = await Notifications.getPermissionsAsync();
  if (status === "granted") return "granted";
  if (status === "denied") return "denied";
  return "undetermined";
}

export async function requestNotificationPermission(): Promise<NotificationPermissionState> {
  const Notifications = await getNotifications();
  if (!Notifications) return "undetermined";
  await ensureAndroidNotificationChannels(Notifications);
  const existing = await getNotificationPermission();
  if (existing === "granted") return "granted";
  const { status } = await Notifications.requestPermissionsAsync();
  if (status === "granted") return "granted";
  if (status === "denied") return "denied";
  return "undetermined";
}

export async function cancelAppointmentNotification(notificationId: string | null): Promise<void> {
  const Notifications = await getNotifications();
  if (!Notifications || !notificationId) return;
  try {
    await Notifications.cancelScheduledNotificationAsync(notificationId);
  } catch {
    // ignore stale ids
  }
}

function reminderTriggerDate(appointment: AppointmentRecord): Date | null {
  if (appointment.reminderMinutesBefore === null) return null;
  const start = new Date(appointment.startISO);
  if (Number.isNaN(start.getTime())) return null;
  const trigger = new Date(start.getTime() - appointment.reminderMinutesBefore * 60 * 1000);
  if (trigger.getTime() <= Date.now()) return null;
  return trigger;
}

export async function scheduleAppointmentReminder(
  appointment: AppointmentRecord,
): Promise<string | null> {
  const Notifications = await getNotifications();
  if (!Notifications) return null;

  const triggerDate = reminderTriggerDate(appointment);
  if (!triggerDate) return null;

  const permission = await requestNotificationPermission();
  if (permission !== "granted") return null;

  const timeRange = formatAppointmentTimeRange(appointment.startISO, appointment.endISO);
  const bodyParts = [timeRange, reminderLabel(appointment.reminderMinutesBefore)].filter(Boolean);

  return Notifications.scheduleNotificationAsync({
    content: {
      title: appointment.title || "Appointment reminder",
      body: bodyParts.join(" · ") || "Upcoming appointment",
      data: { appointmentId: appointment.id },
      sound: true,
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DATE,
      date: triggerDate,
    },
  });
}

export async function syncAppointmentNotification(
  appointment: AppointmentRecord,
  previousNotificationId: string | null,
): Promise<string | null> {
  await cancelAppointmentNotification(previousNotificationId);
  if (appointment.reminderMinutesBefore === null) return null;
  return scheduleAppointmentReminder(appointment);
}

const EXPO_PUSH_TOKEN_STORAGE_KEY = "ideal_solutions_expo_push_token_v1";

function resolveExpoProjectId(): string | undefined {
  const extra = Constants.expoConfig?.extra as { eas?: { projectId?: string } } | undefined;
  const fromExtra = extra?.eas?.projectId;
  const fromEasConfig = Constants.easConfig?.projectId;
  for (const v of [fromExtra, fromEasConfig]) {
    if (typeof v === "string" && v.trim().length > 0) return v.trim();
  }
  return undefined;
}

export async function getStoredExpoPushToken(): Promise<string | null> {
  try {
    return await AsyncStorage.getItem(EXPO_PUSH_TOKEN_STORAGE_KEY);
  } catch {
    return null;
  }
}

export async function persistExpoPushToken(token: string | null): Promise<void> {
  try {
    if (token) await AsyncStorage.setItem(EXPO_PUSH_TOKEN_STORAGE_KEY, token);
    else await AsyncStorage.removeItem(EXPO_PUSH_TOKEN_STORAGE_KEY);
  } catch {
    // ignore
  }
}

/**
 * Registers this device with Expo's push service and stores the token locally.
 * Use a development or store build; Expo Go on Android does not support this flow.
 */
export async function registerExpoPushTokenAsync(): Promise<{ token: string | null; error: string | null }> {
  const Notifications = await getNotifications();
  if (!Notifications) {
    return {
      token: null,
      error:
        "Use a development or production build for Expo push tokens. Expo Go on Android cannot receive remote push.",
    };
  }
  const perm = await getNotificationPermission();
  if (perm !== "granted") {
    return { token: null, error: "Notification permission is not granted." };
  }
  await ensureAndroidNotificationChannels(Notifications);

  const projectId = resolveExpoProjectId();
  if (!projectId) {
    return {
      token: null,
      error:
        "Missing EAS project ID. Run `eas init` in the project folder (or set EXPO_PUBLIC_EAS_PROJECT_ID in .env), then restart Expo.",
    };
  }

  try {
    const expoToken = await Notifications.getExpoPushTokenAsync({ projectId });
    const token = expoToken.data;
    await persistExpoPushToken(token);
    return { token, error: null };
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    return { token: null, error: message };
  }
}

/** Fires a local notification after a short delay (good for verifying permission + channels). */
export async function scheduleLocalTestNotificationInSeconds(seconds: number): Promise<string | null> {
  const Notifications = await getNotifications();
  if (!Notifications) return null;
  const permission = await getNotificationPermission();
  if (permission !== "granted") return null;
  await ensureAndroidNotificationChannels(Notifications);
  const delay = Math.max(1, Math.min(60, Math.floor(seconds)));
  return Notifications.scheduleNotificationAsync({
    content: {
      title: "Ideal Solutions Pro",
      body: "Test notification — local alerts are working on this device.",
      sound: true,
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
      seconds: delay,
      repeats: false,
      ...(Platform.OS === "android" ? { channelId: "default" } : {}),
    },
  });
}
