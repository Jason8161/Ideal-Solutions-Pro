import * as Location from "expo-location";

/** Reverse geocode coordinates to a single-line address label. */
export async function reverseGeocodeAddress(
  latitude: number,
  longitude: number,
): Promise<string | undefined> {
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

/** Forward geocode a street address to coordinates (jobsite verification). */
export async function geocodeAddress(
  address: string,
): Promise<{ latitude: number; longitude: number } | null> {
  const query = address.trim();
  if (!query) return null;
  try {
    const rows = await Location.geocodeAsync(query);
    const first = rows[0];
    if (first && Number.isFinite(first.latitude) && Number.isFinite(first.longitude)) {
      return { latitude: first.latitude, longitude: first.longitude };
    }
  } catch {
    // geocode unavailable
  }
  return null;
}
