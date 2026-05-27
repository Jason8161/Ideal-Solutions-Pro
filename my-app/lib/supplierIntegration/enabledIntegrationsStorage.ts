import AsyncStorage from "@react-native-async-storage/async-storage";

import { getIntegrationSupplierIds } from "@/lib/supplierIntegration/integrationSuppliers";

const STORAGE_KEY = "ideal_supplier_enabled_integrations_v1";

function normalizeIds(raw: unknown): string[] {
  if (!Array.isArray(raw)) return [];
  return raw.filter((id): id is string => typeof id === "string" && id.trim().length > 0);
}

/** Default: all curated integration suppliers enabled on first launch. */
function defaultEnabledIds(): string[] {
  return [...getIntegrationSupplierIds()];
}

export async function loadEnabledSupplierIntegrationIds(): Promise<string[]> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    if (!raw) return defaultEnabledIds();
    const parsed = JSON.parse(raw) as unknown;
    const ids = normalizeIds(parsed);
    if (ids.length === 0) return defaultEnabledIds();
    const allowed = new Set(getIntegrationSupplierIds());
    return ids.filter((id) => allowed.has(id));
  } catch {
    return defaultEnabledIds();
  }
}

export async function saveEnabledSupplierIntegrationIds(ids: string[]): Promise<void> {
  const allowed = new Set(getIntegrationSupplierIds());
  const unique = [...new Set(ids.filter((id) => allowed.has(id)))];
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(unique));
}

export async function setSupplierIntegrationEnabled(
  supplierId: string,
  enabled: boolean,
): Promise<string[]> {
  const current = await loadEnabledSupplierIntegrationIds();
  const set = new Set(current);
  if (enabled) set.add(supplierId);
  else set.delete(supplierId);
  const next = [...set];
  await saveEnabledSupplierIntegrationIds(next);
  return next;
}

export function isSupplierIntegrationEnabled(id: string, enabledIds: readonly string[]): boolean {
  return enabledIds.includes(id);
}
