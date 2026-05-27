import AsyncStorage from "@react-native-async-storage/async-storage";

import {
  STORAGE_BACKUP_STORAGE_KEY,
  defaultStorageBackupPreferences,
  type StorageBackupPreferences,
} from "./storagePolicy";

export async function loadStorageBackupPreferences(): Promise<StorageBackupPreferences> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_BACKUP_STORAGE_KEY);
    if (!raw) return defaultStorageBackupPreferences();
    return { ...defaultStorageBackupPreferences(), ...(JSON.parse(raw) as StorageBackupPreferences) };
  } catch {
    return defaultStorageBackupPreferences();
  }
}

export async function saveStorageBackupPreferences(
  prefs: StorageBackupPreferences,
): Promise<void> {
  await AsyncStorage.setItem(
    STORAGE_BACKUP_STORAGE_KEY,
    JSON.stringify({ ...prefs, updatedAt: new Date().toISOString() }),
  );
}
