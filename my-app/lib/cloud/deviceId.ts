import AsyncStorage from "@react-native-async-storage/async-storage";

const DEVICE_KEY = "ideal_device_id_v1";

function randomDeviceId(): string {
  return `dev-${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;
}

/** Stable per-install device id for boss/employee cloud linking. */
export async function getOrCreateDeviceId(): Promise<string> {
  try {
    const existing = await AsyncStorage.getItem(DEVICE_KEY);
    if (existing?.trim()) return existing.trim();
  } catch {
    // ignore
  }
  const id = randomDeviceId();
  await AsyncStorage.setItem(DEVICE_KEY, id);
  return id;
}
