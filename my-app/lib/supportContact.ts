import Constants from "expo-constants";
import * as Linking from "expo-linking";
import { Alert, Platform } from "react-native";

/** App support inbox — all in-app “email support” actions use this address. */
export const SUPPORT_EMAIL = "jason@ideal-electrical.net";

function supportEmailSubject(appVersion: string): string {
  const version = appVersion.trim() || "unknown";
  return `Ideal Solutions Pro support (v${version})`;
}

function supportEmailBody(appVersion: string): string {
  const os = Platform.OS;
  const osVersion = String(Platform.Version);
  const appName = Constants.expoConfig?.name ?? "Ideal Solutions Pro";
  const version = appVersion.trim() || "unknown";

  return [
    "Describe your question or issue below:",
    "",
    "",
    "—",
    `${appName} v${version}`,
    `Device: ${os} ${osVersion}`,
  ].join("\n");
}

export function buildSupportMailtoUrl(appVersion: string): string {
  const subject = encodeURIComponent(supportEmailSubject(appVersion));
  const body = encodeURIComponent(supportEmailBody(appVersion));
  return `mailto:${encodeURIComponent(SUPPORT_EMAIL)}?subject=${subject}&body=${body}`;
}

export async function openSupportEmail(appVersion: string): Promise<void> {
  const mailto = buildSupportMailtoUrl(appVersion);
  try {
    const canEmail = await Linking.canOpenURL(mailto);
    if (!canEmail) {
      Alert.alert(
        "Email not available",
        `Set up an email app on this device, or write to ${SUPPORT_EMAIL}.`,
      );
      return;
    }
    await Linking.openURL(mailto);
  } catch {
    Alert.alert(
      "Could not open email",
      `Set up an email app on this device, or write to ${SUPPORT_EMAIL}.`,
    );
  }
}
