import { Platform } from "react-native";

import {
  getNotificationPermission,
  nativeNotificationsModuleAvailable,
  requestNotificationPermission,
} from "@/lib/appointmentNotifications";
import { priorityLabel } from "@/lib/customerServiceRequest";
import type { RemoteServiceRequest } from "@/lib/serviceRequestApi";

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

async function ensureServiceRequestChannel(Notifications: NotificationsModule): Promise<void> {
  if (Platform.OS !== "android") return;
  await Notifications.setNotificationChannelAsync("service_requests", {
    name: "Service requests",
    importance: Notifications.AndroidImportance.HIGH,
    vibrationPattern: [0, 250, 120, 250],
  });
}

function truncate(text: string, max: number): string {
  const trimmed = text.trim();
  if (trimmed.length <= max) return trimmed;
  return `${trimmed.slice(0, max - 1).trim()}…`;
}

function notificationTitle(req: RemoteServiceRequest): string {
  if (req.priority === "emergency") return "Emergency service request";
  if (req.priority === "urgent") return "Urgent service request";
  return "New service request";
}

function notificationBody(req: RemoteServiceRequest): string {
  const name = req.customerName.trim() || "Customer";
  const parts: string[] = [name];
  const description = req.description.trim();
  if (description) {
    parts.push(truncate(description, 120));
  } else if (req.serviceAddress.trim()) {
    parts.push(truncate(req.serviceAddress.trim(), 80));
  }
  if (req.priority !== "normal") {
    parts.push(priorityLabel(req.priority));
  }
  return parts.join(" · ");
}

/**
 * Immediate local notification when a customer submits a service request.
 * Requires a dev or production build — not Expo Go on Android (see SERVICE_REQUEST_LINKS.md).
 */
export async function scheduleServiceRequestLocalNotification(
  req: RemoteServiceRequest,
): Promise<string | null> {
  const Notifications = await getNotifications();
  if (!Notifications) return null;

  const permission = await getNotificationPermission();
  if (permission !== "granted") {
    const requested = await requestNotificationPermission();
    if (requested !== "granted") return null;
  }

  await ensureServiceRequestChannel(Notifications);

  return Notifications.scheduleNotificationAsync({
    content: {
      title: notificationTitle(req),
      body: notificationBody(req),
      data: {
        type: "service_request",
        remoteRequestId: req.id,
        serviceCallHref: "/service-calls",
      },
      sound: true,
      ...(Platform.OS === "android" ? { channelId: "service_requests" } : {}),
    },
    trigger: null,
  });
}
