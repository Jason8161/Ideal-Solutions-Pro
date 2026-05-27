import AsyncStorage from "@react-native-async-storage/async-storage";

const ONBOARDING_KEY = "ideal_ai_assistant_onboarding_v1";

export async function hasSeenAiAssistantOnboarding(): Promise<boolean> {
  try {
    const raw = await AsyncStorage.getItem(ONBOARDING_KEY);
    return raw === "1";
  } catch {
    return false;
  }
}

export async function markAiAssistantOnboardingSeen(): Promise<void> {
  await AsyncStorage.setItem(ONBOARDING_KEY, "1");
}
