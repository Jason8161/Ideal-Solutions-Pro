import AsyncStorage from "@react-native-async-storage/async-storage";

const PREFS_KEY = "ideal_ai_assistant_tools_enabled_v1";

export async function loadAiAssistantToolsEnabled(): Promise<boolean> {
  try {
    const raw = await AsyncStorage.getItem(PREFS_KEY);
    if (raw === null) return true;
    return raw === "1";
  } catch {
    return true;
  }
}

export async function saveAiAssistantToolsEnabled(enabled: boolean): Promise<void> {
  await AsyncStorage.setItem(PREFS_KEY, enabled ? "1" : "0");
}
