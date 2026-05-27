import AsyncStorage from "@react-native-async-storage/async-storage";

import { LATEST_BACKUP_AT_KEY } from "./constants";

export async function loadLatestBackupTimestamp(): Promise<string | null> {
  try {
    return await AsyncStorage.getItem(LATEST_BACKUP_AT_KEY);
  } catch {
    return null;
  }
}

export async function saveLatestBackupTimestamp(iso: string): Promise<void> {
  await AsyncStorage.setItem(LATEST_BACKUP_AT_KEY, iso);
}
