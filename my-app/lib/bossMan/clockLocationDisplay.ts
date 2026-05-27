import { Linking, Platform } from "react-native";

import type { ClockLocation } from "@/lib/bossMan/timeTrackingTypes";
import { loadMapsPreference, type MapsAppPreference } from "@/lib/mapsPreference";

export function formatClockLocationLine(location?: ClockLocation | null): string | null {
  if (!location) return null;
  if (location.address?.trim()) return location.address.trim();
  return `${location.latitude.toFixed(5)}, ${location.longitude.toFixed(5)}`;
}

export function buildMapsUrlForCoords(
  preference: MapsAppPreference,
  latitude: number,
  longitude: number,
  label?: string,
): string {
  const resolved = preference === "auto" ? (Platform.OS === "ios" ? "apple" : "google") : preference;
  const lat = latitude.toString();
  const lng = longitude.toString();
  if (resolved === "apple") {
    const q = label ? encodeURIComponent(label) : `${lat},${lng}`;
    return `https://maps.apple.com/?ll=${lat},${lng}&q=${q}`;
  }
  return `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`;
}

export async function openClockLocationInMaps(location: ClockLocation): Promise<boolean> {
  const pref = await loadMapsPreference();
  const label = formatClockLocationLine(location) ?? undefined;
  const url = buildMapsUrlForCoords(pref, location.latitude, location.longitude, label);
  if (Platform.OS === "web") {
    if (typeof window !== "undefined") window.open(url, "_blank", "noopener,noreferrer");
    return true;
  }
  await Linking.openURL(url);
  return true;
}

export function formatClockEventTime(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}
