import AsyncStorage from "@react-native-async-storage/async-storage";

const INTRO_SEEN_KEY = "ideal_legal_intro_seen_v1";

export async function loadLegalIntroSeen(): Promise<boolean> {
  try {
    const raw = await AsyncStorage.getItem(INTRO_SEEN_KEY);
    return raw === "1";
  } catch {
    return false;
  }
}

export async function markLegalIntroSeen(): Promise<void> {
  try {
    await AsyncStorage.setItem(INTRO_SEEN_KEY, "1");
  } catch {
    // Non-fatal
  }
}

export async function clearLegalIntroSeen(): Promise<void> {
  try {
    await AsyncStorage.removeItem(INTRO_SEEN_KEY);
  } catch {
    // Non-fatal
  }
}
