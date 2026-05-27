import AsyncStorage from "@react-native-async-storage/async-storage";

import { loadSelectedMiscAppIds, saveSelectedMiscAppIds } from "@/lib/miscAppPreferences";
import { resolveMiscShortcuts, type ResolvedMiscShortcut } from "@/lib/miscShortcuts";

const STORAGE_KEY = "ideal_solutions_misc_app_quick_links_v1";

/** Max pinned shortcuts shown on Misc Apps. */
export const MAX_MISC_APP_QUICK_LINKS = 8;

function normalizeIds(raw: unknown, allowed: Set<string>): string[] {
  if (!Array.isArray(raw)) return [];
  const out: string[] = [];
  const seen = new Set<string>();
  for (const item of raw) {
    if (typeof item !== "string" || seen.has(item) || !allowed.has(item)) continue;
    seen.add(item);
    out.push(item);
    if (out.length >= MAX_MISC_APP_QUICK_LINKS) break;
  }
  return out;
}

export async function loadMiscAppQuickLinkIds(): Promise<string[]> {
  try {
    const selected = await loadSelectedMiscAppIds();
    const allowed = new Set(selected);
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    return normalizeIds(JSON.parse(raw) as unknown, allowed);
  } catch {
    return [];
  }
}

export async function saveMiscAppQuickLinkIds(ids: string[]): Promise<void> {
  const selected = await loadSelectedMiscAppIds();
  const allowed = new Set(selected);
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(normalizeIds(ids, allowed)));
}

export async function quickLinkMiscShortcuts(ids: string[]): Promise<ResolvedMiscShortcut[]> {
  return resolveMiscShortcuts(ids);
}

/** Pin shortcut for the Misc Apps quick-link row; ensures it stays on the user's list. */
export async function assignMiscAppQuickLink(id: string): Promise<void> {
  const selected = await loadSelectedMiscAppIds();
  if (!selected.includes(id)) {
    await saveSelectedMiscAppIds([...selected, id]);
  }

  const current = await loadMiscAppQuickLinkIds();
  const next = [id, ...current.filter((x) => x !== id)].slice(0, MAX_MISC_APP_QUICK_LINKS);
  await saveMiscAppQuickLinkIds(next);
}

export async function removeMiscAppQuickLink(id: string): Promise<void> {
  const current = await loadMiscAppQuickLinkIds();
  await saveMiscAppQuickLinkIds(current.filter((x) => x !== id));
}
