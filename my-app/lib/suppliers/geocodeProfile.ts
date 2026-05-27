import * as Location from "expo-location";

import { lookupZipCentroid } from "@/lib/suppliers/zipCentroid";
import type { Coords } from "@/lib/suppliers/types";
import { getShippingAddressParts, type ShippingAddressParts } from "@/lib/suppliers/shippingOrigin";

/** Geocode shipping (or company) address for persistence on profile save. */
export async function geocodeShippingAddressParts(
  parts: ShippingAddressParts,
): Promise<{ latitude: number; longitude: number } | null> {
  if (!parts.complete) return null;

  try {
    const results = await Location.geocodeAsync(parts.fullAddress);
    const first = results[0];
    if (first && Number.isFinite(first.latitude) && Number.isFinite(first.longitude)) {
      return { latitude: first.latitude, longitude: first.longitude };
    }
  } catch {
    // zip fallback below
  }

  const centroid = lookupZipCentroid(parts.zip, parts.state);
  if (centroid) {
    return { latitude: centroid.latitude, longitude: centroid.longitude };
  }
  return null;
}

export async function geocodeShippingFromParts(
  parts: ShippingAddressParts,
): Promise<Coords | null> {
  const row = await geocodeShippingAddressParts(parts);
  if (!row) return null;
  return { latitude: row.latitude, longitude: row.longitude };
}
