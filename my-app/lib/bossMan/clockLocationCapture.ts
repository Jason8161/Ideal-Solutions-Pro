import * as Location from "expo-location";
import { Platform } from "react-native";

import type { ClockLocation } from "@/lib/bossMan/timeTrackingTypes";

export type ClockLocationCaptureResult =
  | { granted: true; location: ClockLocation }
  | { granted: false; location?: undefined; reason: "denied" | "unavailable" | "web" };

function normalizeClockLocation(
  coords: Location.LocationObjectCoords,
  address?: string,
): ClockLocation {
  return {
    latitude: coords.latitude,
    longitude: coords.longitude,
    address: address?.trim() || undefined,
    accuracy:
      coords.accuracy != null && Number.isFinite(coords.accuracy) ? coords.accuracy : undefined,
    capturedAt: new Date().toISOString(),
  };
}

async function reverseGeocodeLabel(latitude: number, longitude: number): Promise<string | undefined> {
  try {
    const rows = await Location.reverseGeocodeAsync({ latitude, longitude });
    const first = rows[0];
    if (!first) return undefined;
    const parts = [
      [first.streetNumber, first.street].filter(Boolean).join(" "),
      first.city ?? first.subregion,
      first.region,
      first.postalCode,
    ].filter((p) => typeof p === "string" && p.trim().length > 0);
    const line = parts.join(", ").trim();
    return line || first.name?.trim() || undefined;
  } catch {
    return undefined;
  }
}

/**
 * Best-effort GPS at clock time. Does not throw; returns denied/unavailable when permission or hardware fails.
 */
export async function captureClockLocationAsync(): Promise<ClockLocationCaptureResult> {
  if (Platform.OS === "web") {
    return { granted: false, reason: "web" };
  }

  try {
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== "granted") {
      return { granted: false, reason: "denied" };
    }

    const position = await Location.getCurrentPositionAsync({
      accuracy: Location.Accuracy.Balanced,
    });

    const address = await reverseGeocodeLabel(
      position.coords.latitude,
      position.coords.longitude,
    );

    return {
      granted: true,
      location: normalizeClockLocation(position.coords, address),
    };
  } catch {
    return { granted: false, reason: "unavailable" };
  }
}
