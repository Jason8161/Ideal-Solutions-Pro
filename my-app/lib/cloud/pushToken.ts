import { Platform } from "react-native";

import { registerCloudPushToken } from "@/lib/cloud/client";
import { loadEmployeeSession } from "@/lib/employeeSession";

/**
 * MVP: request Expo push permission and register token on server.
 * Server-side send is phase 2 (see docs/EMPLOYEE_BOSS_CLOUD.md).
 */
export async function registerEmployeePushTokenIfPossible(): Promise<string | null> {
  const session = await loadEmployeeSession();
  if (!session.active || !session.cloudAuthToken) return null;

  try {
    const Notifications = await import("expo-notifications");
    const { status: existing } = await Notifications.getPermissionsAsync();
    let finalStatus = existing;
    if (existing !== "granted") {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }
    if (finalStatus !== "granted") return null;

    const projectId =
      typeof process !== "undefined" ? process.env.EXPO_PUBLIC_EAS_PROJECT_ID?.trim() : "";
    const tokenData = await Notifications.getExpoPushTokenAsync(
      projectId ? { projectId } : undefined,
    );
    const token = tokenData.data;
    await registerCloudPushToken(
      session.cloudAuthToken,
      token,
      Platform.OS,
    );
    return token;
  } catch {
    return null;
  }
}
