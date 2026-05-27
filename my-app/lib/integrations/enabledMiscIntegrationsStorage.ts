import AsyncStorage from "@react-native-async-storage/async-storage";

import { miscIntegrationIds } from "@/lib/integrations/miscCatalog";

const STORAGE_KEY = "ideal_misc_enabled_integrations_v1";

function normalizeIds(raw: unknown): string[] {
  if (!Array.isArray(raw)) return [];
  return raw.filter((id): id is string => typeof id === "string" && id.trim().length > 0);
}

function defaultEnabledIds(): string[] {
  return [];
}

export async function loadEnabledMiscIntegrationIds(): Promise<string[]> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    if (!raw) return defaultEnabledIds();
    const parsed = JSON.parse(raw) as unknown;
    const ids = normalizeIds(parsed);
    if (ids.length === 0) return defaultEnabledIds();
    const allowed = new Set(miscIntegrationIds());
    return ids.filter((id) => allowed.has(id));
  } catch {
    return defaultEnabledIds();
  }
}

export async function saveEnabledMiscIntegrationIds(ids: string[]): Promise<void> {
  const allowed = new Set(miscIntegrationIds());
  const unique = [...new Set(ids.filter((id) => allowed.has(id)))];
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(unique));
}

export async function setMiscIntegrationEnabled(id: string, enabled: boolean): Promise<string[]> {
  const current = await loadEnabledMiscIntegrationIds();
  const set = new Set(current);
  if (enabled) set.add(id);
  else set.delete(id);
  const next = [...set];
  await saveEnabledMiscIntegrationIds(next);
  return next;
}
