import AsyncStorage from "@react-native-async-storage/async-storage";
import * as SecureStore from "expo-secure-store";
import { Platform } from "react-native";

import {
  DEFAULT_CLOCK_VERIFICATION_PREFERENCES,
  type ClockVerificationPreferences,
} from "./types";

const PREFS_KEY = "ideal_clock_verification_prefs_v1";
const SECURE_OVERRIDE_KEY = "ideal_clock_supervisor_override_v1";

function clampFeet(value: number): number {
  if (!Number.isFinite(value)) return DEFAULT_CLOCK_VERIFICATION_PREFERENCES.geofenceDistanceFeet;
  return Math.min(5000, Math.max(50, Math.round(value)));
}

function normalizePrefs(raw: Partial<ClockVerificationPreferences>): ClockVerificationPreferences {
  return {
    gpsVerificationEnabled:
      raw.gpsVerificationEnabled ?? DEFAULT_CLOCK_VERIFICATION_PREFERENCES.gpsVerificationEnabled,
    geofencingEnabled:
      raw.geofencingEnabled ?? DEFAULT_CLOCK_VERIFICATION_PREFERENCES.geofencingEnabled,
    geofenceDistanceFeet: clampFeet(
      raw.geofenceDistanceFeet ?? DEFAULT_CLOCK_VERIFICATION_PREFERENCES.geofenceDistanceFeet,
    ),
    photoVerificationEnabled:
      raw.photoVerificationEnabled ?? DEFAULT_CLOCK_VERIFICATION_PREFERENCES.photoVerificationEnabled,
    offlineClockInsAllowed:
      raw.offlineClockInsAllowed ?? DEFAULT_CLOCK_VERIFICATION_PREFERENCES.offlineClockInsAllowed,
    requireAssignedJobsite:
      raw.requireAssignedJobsite ?? DEFAULT_CLOCK_VERIFICATION_PREFERENCES.requireAssignedJobsite,
    supervisorOverrideAllowed:
      raw.supervisorOverrideAllowed ??
      DEFAULT_CLOCK_VERIFICATION_PREFERENCES.supervisorOverrideAllowed,
    punchDebounceSeconds: Math.min(
      120,
      Math.max(10, raw.punchDebounceSeconds ?? DEFAULT_CLOCK_VERIFICATION_PREFERENCES.punchDebounceSeconds),
    ),
  };
}

export async function loadClockVerificationPreferences(): Promise<ClockVerificationPreferences> {
  try {
    const raw = await AsyncStorage.getItem(PREFS_KEY);
    if (!raw) return { ...DEFAULT_CLOCK_VERIFICATION_PREFERENCES };
    return normalizePrefs(JSON.parse(raw) as Partial<ClockVerificationPreferences>);
  } catch {
    return { ...DEFAULT_CLOCK_VERIFICATION_PREFERENCES };
  }
}

export async function saveClockVerificationPreferences(
  prefs: ClockVerificationPreferences,
): Promise<ClockVerificationPreferences> {
  const normalized = normalizePrefs(prefs);
  await AsyncStorage.setItem(PREFS_KEY, JSON.stringify(normalized));
  return normalized;
}

/** Optional secure flag for supervisor override sessions (stub — no PIN yet). */
export async function setSupervisorOverrideActive(active: boolean): Promise<void> {
  if (Platform.OS === "web") return;
  try {
    if (active) {
      await SecureStore.setItemAsync(SECURE_OVERRIDE_KEY, new Date().toISOString());
    } else {
      await SecureStore.deleteItemAsync(SECURE_OVERRIDE_KEY);
    }
  } catch {
    // SecureStore unavailable — ignore
  }
}

export async function isSupervisorOverrideActive(): Promise<boolean> {
  if (Platform.OS === "web") return false;
  try {
    const value = await SecureStore.getItemAsync(SECURE_OVERRIDE_KEY);
    return Boolean(value?.trim());
  } catch {
    return false;
  }
}
