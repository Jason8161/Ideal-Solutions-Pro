import AsyncStorage from "@react-native-async-storage/async-storage";
import { Platform } from "react-native";

import {
  getNotificationPermission,
  nativeNotificationsModuleAvailable,
  requestNotificationPermission,
} from "@/lib/appointmentNotifications";
import { priorityLabel } from "@/lib/customerServiceRequest";
import type { RemoteServiceRequest } from "@/lib/serviceRequestApi";

type NotificationsModule = typeof import("expo-notifications");

const REMINDER_IDS_KEY = "ideal_service_request_reminder_ids_v1";

export type ServiceRequestReminderOption = "1h" | "4h" | "24h" | "tomorrow_morning";

export const SERVICE_REQUEST_REMINDER_OPTIONS: {
  id: ServiceRequestReminderOption;
  label: string;
}[] = [
  { id: "1h", label: "In 1 hour" },
  { id: "4h", label: "In 4 hours" },
  { id: "24h", label: "In 24 hours" },
  { id: "tomorrow_morning", label: "Tomorrow at 9 AM" },
];

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

async function ensureReminderChannel(Notifications: NotificationsModule): Promise<void> {
  if (Platform.OS !== "android") return;
  await Notifications.setNotificationChannelAsync("service_request_reminders", {
    name: "Service request reminders",
    importance: Notifications.AndroidImportance.HIGH,
    vibrationPattern: [0, 250, 120, 250],
  });
}

function reminderTriggerDate(option: ServiceRequestReminderOption): Date {
  const now = new Date();
  switch (option) {
    case "1h":
      return new Date(now.getTime() + 60 * 60 * 1000);
    case "4h":
      return new Date(now.getTime() + 4 * 60 * 60 * 1000);
    case "24h":
      return new Date(now.getTime() + 24 * 60 * 60 * 1000);
    case "tomorrow_morning": {
      const next = new Date(now);
      next.setDate(next.getDate() + 1);
      next.setHours(9, 0, 0, 0);
      return next;
    }
    default:
      return new Date(now.getTime() + 24 * 60 * 60 * 1000);
  }
}

function reminderTitle(req: RemoteServiceRequest): string {
  const name = req.customerName.trim() || "Customer";
  if (req.priority === "emergency") return `Reminder: emergency request — ${name}`;
  if (req.priority === "urgent") return `Reminder: urgent request — ${name}`;
  return `Reminder: respond to ${name}`;
}

function reminderBody(req: RemoteServiceRequest): string {
  const parts: string[] = [];
  const description = req.description.trim();
  if (description) parts.push(description.slice(0, 100));
  if (req.phone.trim()) parts.push(req.phone.trim());
  if (req.priority !== "normal") parts.push(priorityLabel(req.priority));
  return parts.join(" · ") || "Customer service request waiting for your response";
}

async function persistReminderId(remoteRequestId: string, notificationId: string): Promise<void> {
  try {
    const raw = await AsyncStorage.getItem(REMINDER_IDS_KEY);
    const map =
      raw && typeof JSON.parse(raw) === "object" && !Array.isArray(JSON.parse(raw))
        ? (JSON.parse(raw) as Record<string, string>)
        : {};
    map[remoteRequestId.trim()] = notificationId;
    await AsyncStorage.setItem(REMINDER_IDS_KEY, JSON.stringify(map));
  } catch {
    // ignore
  }
}

export async function scheduleServiceRequestResponseReminder(
  req: RemoteServiceRequest,
  option: ServiceRequestReminderOption = "24h",
): Promise<string | null> {
  const Notifications = await getNotifications();
  if (!Notifications || !req.id?.trim()) return null;

  const permission = await getNotificationPermission();
  if (permission !== "granted") {
    const requested = await requestNotificationPermission();
    if (requested !== "granted") return null;
  }

  await ensureReminderChannel(Notifications);
  const triggerDate = reminderTriggerDate(option);
  if (triggerDate.getTime() <= Date.now()) return null;

  const notificationId = await Notifications.scheduleNotificationAsync({
    content: {
      title: reminderTitle(req),
      body: reminderBody(req),
      data: {
        type: "service_request_reminder",
        remoteRequestId: req.id,
        serviceCallHref: "/service-calls/current",
      },
      sound: true,
      ...(Platform.OS === "android" ? { channelId: "service_request_reminders" } : {}),
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DATE,
      date: triggerDate,
    },
  });

  await persistReminderId(req.id, notificationId);
  return notificationId;
}
