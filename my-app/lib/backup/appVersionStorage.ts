import AsyncStorage from "@react-native-async-storage/async-storage";
import Constants from "expo-constants";

import {
  LAST_SEEN_APP_VERSION_KEY,
  RESTORE_PROMPT_SEEN_KEY,
  UPDATE_BACKUP_ACK_VERSION_KEY,
} from "./constants";

export function getCurrentAppVersion(): string {
  return Constants.expoConfig?.version ?? "1.0.0";
}

function parseVersionParts(version: string): [number, number, number] {
  const parts = version.split(".").map((part) => {
    const n = parseInt(part.replace(/[^0-9].*$/, ""), 10);
    return Number.isFinite(n) ? n : 0;
  });
  return [parts[0] ?? 0, parts[1] ?? 0, parts[2] ?? 0];
}

export function compareAppVersions(a: string, b: string): number {
  const [a0, a1, a2] = parseVersionParts(a);
  const [b0, b1, b2] = parseVersionParts(b);
  if (a0 !== b0) return a0 - b0;
  if (a1 !== b1) return a1 - b1;
  return a2 - b2;
}

export function isAppVersionGreater(next: string, previous: string): boolean {
  return compareAppVersions(next, previous) > 0;
}

export async function loadLastSeenAppVersion(): Promise<string | null> {
  try {
    return await AsyncStorage.getItem(LAST_SEEN_APP_VERSION_KEY);
  } catch {
    return null;
  }
}

export async function saveLastSeenAppVersion(version: string): Promise<void> {
  await AsyncStorage.setItem(LAST_SEEN_APP_VERSION_KEY, version);
}

export async function loadUpdateBackupAckVersion(): Promise<string | null> {
  try {
    return await AsyncStorage.getItem(UPDATE_BACKUP_ACK_VERSION_KEY);
  } catch {
    return null;
  }
}

export async function markUpdateBackupAcknowledged(version: string): Promise<void> {
  await AsyncStorage.multiSet([
    [UPDATE_BACKUP_ACK_VERSION_KEY, version],
    [LAST_SEEN_APP_VERSION_KEY, version],
  ]);
}

export async function shouldShowPreUpdateBackupModal(): Promise<boolean> {
  const current = getCurrentAppVersion();
  const lastSeen = await loadLastSeenAppVersion();
  const ackVersion = await loadUpdateBackupAckVersion();

  if (ackVersion === current) return false;
  if (!lastSeen) {
    await saveLastSeenAppVersion(current);
    return false;
  }
  return isAppVersionGreater(current, lastSeen);
}

export async function loadRestorePromptSeen(): Promise<boolean> {
  try {
    const raw = await AsyncStorage.getItem(RESTORE_PROMPT_SEEN_KEY);
    return raw === "1";
  } catch {
    return false;
  }
}

export async function markRestorePromptSeen(): Promise<void> {
  await AsyncStorage.setItem(RESTORE_PROMPT_SEEN_KEY, "1");
}

export async function shouldShowRestorePrompt(): Promise<boolean> {
  if (await loadRestorePromptSeen()) return false;
  return true;
}
