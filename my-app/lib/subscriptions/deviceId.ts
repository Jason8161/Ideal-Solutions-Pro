import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Application from "expo-application";
import { Platform } from "react-native";

const DEVICE_ID_KEY = "ideal_device_install_id_v1";

/** Stable per-install id for trial anti-abuse (not advertising ID). */
export async function getDeviceInstallId(): Promise<string> {
  try {
    const cached = await AsyncStorage.getItem(DEVICE_ID_KEY);
    if (cached?.trim()) return cached.trim();
  } catch {
    /* fall through */
  }

  let generated = "";
  if (Platform.OS === "ios" && Application.getIosIdForVendorAsync) {
    try {
      generated = (await Application.getIosIdForVendorAsync()) ?? "";
    } catch {
      generated = "";
    }
  }
  if (!generated && Application.androidId) {
    generated = Application.androidId;
  }
  if (!generated) {
    generated = `expo-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
  }

  try {
    await AsyncStorage.setItem(DEVICE_ID_KEY, generated);
  } catch {
    /* best effort */
  }
  return generated;
}
