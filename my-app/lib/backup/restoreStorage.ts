import AsyncStorage from "@react-native-async-storage/async-storage";

import { isAppBackupKey } from "./collectAllAppData";
import {
  ASSET_URI_PREFIX,
  LATEST_BACKUP_AT_KEY,
  LAST_SEEN_APP_VERSION_KEY,
  RESTORE_PROMPT_SEEN_KEY,
  UPDATE_BACKUP_ACK_VERSION_KEY,
} from "./constants";

const PRESERVE_ON_RESTORE = new Set([
  RESTORE_PROMPT_SEEN_KEY,
  LAST_SEEN_APP_VERSION_KEY,
  UPDATE_BACKUP_ACK_VERSION_KEY,
  LATEST_BACKUP_AT_KEY,
]);

const MULTI_SET_BATCH_SIZE = 40;

/** Remove app data keys before a full restore (keeps version / prompt metadata). */
export async function clearRestorableAppKeys(): Promise<void> {
  const keys = (await AsyncStorage.getAllKeys()).filter(
    (k) => isAppBackupKey(k) && !PRESERVE_ON_RESTORE.has(k),
  );
  if (keys.length === 0) return;
  await AsyncStorage.multiRemove(keys);
}

export async function applyRestoredEntries(pairs: [string, string][]): Promise<void> {
  for (let i = 0; i < pairs.length; i += MULTI_SET_BATCH_SIZE) {
    const batch = pairs.slice(i, i + MULTI_SET_BATCH_SIZE);
    await AsyncStorage.multiSet(batch);
  }
}

/** Drop asset placeholders that could not be resolved to real file URIs. */
export function stripUnresolvedAssetPlaceholders(value: string): string {
  const tokenPattern = new RegExp(`${escapeRegExp(ASSET_URI_PREFIX)}[^\\s"']+`, "g");
  return value.replace(tokenPattern, "");
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
