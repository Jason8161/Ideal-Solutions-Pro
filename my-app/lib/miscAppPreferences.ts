import AsyncStorage from "@react-native-async-storage/async-storage";

import { parseCustomMiscShortcutId, loadCustomMiscApps } from "@/lib/miscCustomApps";
import {
  MISC_APPS_CATALOG,
  miscAppById,
  type MiscAppDefinition,
  type MiscAppId,
} from "@/lib/miscAppsCatalog";
import { resolveMiscShortcuts, type ResolvedMiscShortcut } from "@/lib/miscShortcuts";

const STORAGE_KEY = "ideal_solutions_misc_app_ids_v1";

/** Empty by default — user builds their shortcut list. */
export const DEFAULT_MISC_APP_IDS: readonly string[] = [];

async function isValidShortcutId(id: string): Promise<boolean> {
  if (miscAppById(id)) return true;
  const customId = parseCustomMiscShortcutId(id);
  if (!customId) return false;
  const customs = await loadCustomMiscApps();
  return customs.some((c) => c.id === customId);
}

function normalizeIds(raw: unknown): string[] {
  if (!Array.isArray(raw)) return [...DEFAULT_MISC_APP_IDS];
  const out: string[] = [];
  const seen = new Set<string>();
  for (const item of raw) {
    if (typeof item !== "string" || seen.has(item)) continue;
    seen.add(item);
    out.push(item);
  }
  return out;
}

export async function loadSelectedMiscAppIds(): Promise<string[]> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    if (!raw) return [...DEFAULT_MISC_APP_IDS];
    const parsed = normalizeIds(JSON.parse(raw) as unknown);
    const valid: string[] = [];
    for (const id of parsed) {
      if (await isValidShortcutId(id)) valid.push(id);
    }
    return valid;
  } catch {
    return [...DEFAULT_MISC_APP_IDS];
  }
}

export async function saveSelectedMiscAppIds(ids: string[]): Promise<void> {
  const normalized = normalizeIds(ids);
  const valid: string[] = [];
  for (const id of normalized) {
    if (await isValidShortcutId(id)) valid.push(id);
  }
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(valid));
}

export async function selectedMiscShortcuts(ids: string[]): Promise<ResolvedMiscShortcut[]> {
  return resolveMiscShortcuts(ids);
}

/** @deprecated Use selectedMiscShortcuts */
export function selectedMiscApps(ids: MiscAppId[]): MiscAppDefinition[] {
  return ids.map((id) => miscAppById(id)).filter((a): a is MiscAppDefinition => a != null);
}

export function catalogMiscAppsNotSelected(selected: string[]): MiscAppDefinition[] {
  const set = new Set(selected);
  return MISC_APPS_CATALOG.filter((a) => !set.has(a.id));
}
