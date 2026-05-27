import AsyncStorage from "@react-native-async-storage/async-storage";

const KEY = "ideal_solutions_maps_app_pref_v1";

/** Which maps app to use when opening a customer address. */
export type MapsAppPreference = "auto" | "apple" | "google";

export const MAPS_PREF_LABELS: Record<MapsAppPreference, string> = {
  auto: "Auto (device default)",
  apple: "Apple Maps",
  google: "Google Maps",
};

export function normalizeMapsPreference(raw: string | null | undefined): MapsAppPreference {
  if (raw === "apple" || raw === "google" || raw === "auto") return raw;
  return "auto";
}

export async function loadMapsPreference(): Promise<MapsAppPreference> {
  try {
    const v = await AsyncStorage.getItem(KEY);
    return normalizeMapsPreference(v ?? undefined);
  } catch {
    return "auto";
  }
}

export async function saveMapsPreference(value: MapsAppPreference): Promise<void> {
  await AsyncStorage.setItem(KEY, value);
}
