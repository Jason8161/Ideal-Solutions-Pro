import AsyncStorage from "@react-native-async-storage/async-storage";

const HOME_ACCOUNTING_LAUNCH_URL_KEY = "ideal_solutions_home_accounting_launch_url_v1";
const HOME_BANK_LAUNCH_URL_KEY = "ideal_solutions_home_bank_launch_url_v1";

export async function loadHomeAccountingLaunchUrlOverride(): Promise<string | null> {
  try {
    const raw = await AsyncStorage.getItem(HOME_ACCOUNTING_LAUNCH_URL_KEY);
    if (!raw || !raw.trim()) return null;
    return raw.trim();
  } catch {
    return null;
  }
}

export async function saveHomeAccountingLaunchUrlOverride(url: string | null): Promise<void> {
  if (url == null || url.trim() === "") {
    await AsyncStorage.removeItem(HOME_ACCOUNTING_LAUNCH_URL_KEY);
    return;
  }
  await AsyncStorage.setItem(HOME_ACCOUNTING_LAUNCH_URL_KEY, url.trim());
}

export async function loadHomeBankLaunchUrlOverride(): Promise<string | null> {
  try {
    const raw = await AsyncStorage.getItem(HOME_BANK_LAUNCH_URL_KEY);
    if (!raw || !raw.trim()) return null;
    return raw.trim();
  } catch {
    return null;
  }
}

export async function saveHomeBankLaunchUrlOverride(url: string | null): Promise<void> {
  if (url == null || url.trim() === "") {
    await AsyncStorage.removeItem(HOME_BANK_LAUNCH_URL_KEY);
    return;
  }
  await AsyncStorage.setItem(HOME_BANK_LAUNCH_URL_KEY, url.trim());
}
