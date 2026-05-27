import AsyncStorage from "@react-native-async-storage/async-storage";

const TOKEN_KEY = "ideal_solutions_contractor_request_token_v1";

function newToken(): string {
  return `ctr-${Date.now()}-${Math.random().toString(36).slice(2, 14)}`;
}

/** Stable per-device token used in customer Request Service links and inbox sync. */
export async function getOrCreateContractorRequestToken(): Promise<string> {
  try {
    const existing = await AsyncStorage.getItem(TOKEN_KEY);
    if (existing?.trim()) return existing.trim();
    const token = newToken();
    await AsyncStorage.setItem(TOKEN_KEY, token);
    return token;
  } catch {
    return newToken();
  }
}

export async function resetContractorRequestToken(): Promise<string> {
  const token = newToken();
  await AsyncStorage.setItem(TOKEN_KEY, token);
  return token;
}
