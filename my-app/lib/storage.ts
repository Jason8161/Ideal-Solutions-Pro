import AsyncStorage from "@react-native-async-storage/async-storage";

export const STORAGE_KEYS = {
  distributorPortalUrl: "distributorPortalUrl",
} as const;

export async function getDistributorPortalUrl(): Promise<string> {
  const v = await AsyncStorage.getItem(STORAGE_KEYS.distributorPortalUrl);
  return v ?? "";
}

export async function setDistributorPortalUrl(url: string): Promise<void> {
  await AsyncStorage.setItem(STORAGE_KEYS.distributorPortalUrl, url.trim());
}
