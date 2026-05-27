import { Platform } from "react-native";

import { captureClockLocationAsync } from "@/lib/bossMan/clockLocationCapture";
import type { ClockLocation } from "@/lib/bossMan/timeTrackingTypes";

import type { ClockVerificationPreferences } from "./types";

export type GpsCaptureResult =
  | { ok: true; location: ClockLocation }
  | { ok: false; reason: "denied" | "unavailable" | "web" | "disabled" };

/**
 * One-shot foreground GPS capture at punch time — no background tracking.
 */
export async function captureGpsOnce(
  prefs?: Pick<ClockVerificationPreferences, "gpsVerificationEnabled">,
): Promise<GpsCaptureResult> {
  if (prefs && !prefs.gpsVerificationEnabled) {
    return { ok: false, reason: "disabled" };
  }
  if (Platform.OS === "web") {
    return { ok: false, reason: "web" };
  }

  const capture = await captureClockLocationAsync();
  if (!capture.granted || !capture.location) {
    return { ok: false, reason: capture.reason === "denied" ? "denied" : "unavailable" };
  }
  return { ok: true, location: capture.location };
}
