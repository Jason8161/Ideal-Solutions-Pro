import AsyncStorage from "@react-native-async-storage/async-storage";

import { BOSS_MAN_MENU_ITEMS } from "@/lib/bossMan/bossManMenuItems";

const KEY = "ideal_solutions_job_folder_hub_enabled_v1";

/** Keys for hub tiles inside Job Folder category sub-menus. */
export const JOB_FOLDER_HUB_MENU_KEYS = BOSS_MAN_MENU_ITEMS.map((item) => item.key);

export type JobFolderHubMenuKey = (typeof JOB_FOLDER_HUB_MENU_KEYS)[number];

const VALID_KEYS = new Set<string>(JOB_FOLDER_HUB_MENU_KEYS);

export function getDefaultJobFolderHubEnabledKeys(): JobFolderHubMenuKey[] {
  return [...JOB_FOLDER_HUB_MENU_KEYS];
}

function normalizeEnabledKeys(raw: unknown): JobFolderHubMenuKey[] {
  if (!Array.isArray(raw)) return getDefaultJobFolderHubEnabledKeys();
  const filtered = raw.filter(
    (k): k is JobFolderHubMenuKey => typeof k === "string" && VALID_KEYS.has(k),
  );
  return filtered.length > 0 ? filtered : getDefaultJobFolderHubEnabledKeys();
}

export async function loadJobFolderHubEnabledKeys(): Promise<JobFolderHubMenuKey[]> {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    if (!raw) return getDefaultJobFolderHubEnabledKeys();
    return normalizeEnabledKeys(JSON.parse(raw));
  } catch {
    return getDefaultJobFolderHubEnabledKeys();
  }
}

export async function saveJobFolderHubEnabledKeys(keys: readonly string[]): Promise<void> {
  const filtered = keys.filter((k): k is JobFolderHubMenuKey => VALID_KEYS.has(k));
  await AsyncStorage.setItem(KEY, JSON.stringify(filtered));
}

export function isJobFolderHubItemEnabled(
  key: string,
  enabledKeys: readonly string[],
): boolean {
  return enabledKeys.includes(key);
}
