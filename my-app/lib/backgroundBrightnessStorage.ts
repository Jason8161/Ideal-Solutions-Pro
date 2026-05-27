import AsyncStorage from "@react-native-async-storage/async-storage";

const STORAGE_KEY = "ideal_solutions_background_brightness_v1";

export const BACKGROUND_BRIGHTNESS_MAX = 100;
export const DEFAULT_BACKGROUND_BRIGHTNESS = 0;

/** White wash opacity at 100% brightness (0% = no extra light). */
export const BACKGROUND_BRIGHTNESS_SCRIM_MAX = 0.55;

export const BACKGROUND_BRIGHTNESS_LEVELS = [
  { value: 0, label: "Default" },
  { value: 25, label: "Light" },
  { value: 50, label: "Medium" },
  { value: 75, label: "Bright" },
  { value: 100, label: "Maximum" },
] as const;

export function normalizeBackgroundBrightness(raw: number | string | null | undefined): number {
  const n = typeof raw === "string" ? Number.parseInt(raw, 10) : raw;
  if (typeof n !== "number" || Number.isNaN(n)) return DEFAULT_BACKGROUND_BRIGHTNESS;
  return Math.min(BACKGROUND_BRIGHTNESS_MAX, Math.max(0, Math.round(n)));
}

export function backgroundBrightnessToWhiteScrimAlpha(brightness: number): number {
  const clamped = normalizeBackgroundBrightness(brightness);
  return (clamped / BACKGROUND_BRIGHTNESS_MAX) * BACKGROUND_BRIGHTNESS_SCRIM_MAX;
}

export async function loadBackgroundBrightness(): Promise<number> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    if (raw == null) return DEFAULT_BACKGROUND_BRIGHTNESS;
    return normalizeBackgroundBrightness(raw);
  } catch {
    return DEFAULT_BACKGROUND_BRIGHTNESS;
  }
}

export async function saveBackgroundBrightness(value: number): Promise<void> {
  const normalized = normalizeBackgroundBrightness(value);
  await AsyncStorage.setItem(STORAGE_KEY, String(normalized));
}
