import { Linking, Platform } from "react-native";

import type { MapsAppPreference } from "./mapsPreference";
import { loadMapsPreference } from "./mapsPreference";

export type AddressForMaps = {
  street: string;
  city: string;
  state: string;
  zip: string;
};

/** Single line for geocode / maps query. */
export function formatAddressLine(a: AddressForMaps): string {
  const parts = [a.street.trim(), a.city.trim(), a.state.trim(), a.zip.trim()].filter(Boolean);
  return parts.join(", ");
}

/**
 * Build a maps URL for a free-text address query.
 * `auto` uses Apple Maps on iOS and Google Maps on Android.
 */
export function buildMapsUrlForQuery(preference: MapsAppPreference, query: string): string | null {
  const q = query.trim();
  if (!q) return null;
  const resolved = preference === "auto" ? (Platform.OS === "ios" ? "apple" : "google") : preference;
  const enc = encodeURIComponent(q);
  if (resolved === "apple") return `https://maps.apple.com/?q=${enc}`;
  return `https://www.google.com/maps/search/?api=1&query=${enc}`;
}

export async function openAddressInMaps(address: AddressForMaps): Promise<boolean> {
  const line = formatAddressLine(address);
  if (!line) return false;
  const pref = await loadMapsPreference();
  const url = buildMapsUrlForQuery(pref, line);
  if (!url) return false;
  if (Platform.OS === "web") {
    if (typeof window !== "undefined") window.open(url, "_blank", "noopener,noreferrer");
    return true;
  }
  await Linking.openURL(url);
  return true;
}
