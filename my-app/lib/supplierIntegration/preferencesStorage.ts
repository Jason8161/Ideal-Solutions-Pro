import AsyncStorage from "@react-native-async-storage/async-storage";

import {
  DEFAULT_SUPPLIER_FAVORITES,
  DEFAULT_SUPPLIER_INTEGRATION_PREFS,
  type SupplierFavoritesState,
  type SupplierIntegrationPrefs,
} from "@/lib/supplierIntegration/types";

const PREFS_KEY = "ideal_supplier_integration_prefs_v1";
const FAVORITES_KEY = "ideal_supplier_favorites_v1";

function normalizePrefs(raw: unknown): SupplierIntegrationPrefs {
  if (!raw || typeof raw !== "object") return { ...DEFAULT_SUPPLIER_INTEGRATION_PREFS };
  const o = raw as Record<string, unknown>;
  return {
    enableSupplierApps: o.enableSupplierApps !== false,
    autoOpenInstalled: o.autoOpenInstalled !== false,
    askBeforeLaunch: o.askBeforeLaunch === true,
    websiteFallback: o.websiteFallback !== false,
    branchDetection: o.branchDetection !== false,
    syncFavoritesWithTiles: o.syncFavoritesWithTiles !== false,
  };
}

function normalizeStringIds(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value.filter((x): x is string => typeof x === "string");
  }
  return [];
}

function normalizeFavorites(raw: unknown): SupplierFavoritesState {
  if (Array.isArray(raw)) {
    return { ...DEFAULT_SUPPLIER_FAVORITES, favoriteIds: normalizeStringIds(raw) };
  }
  if (!raw || typeof raw !== "object") return { ...DEFAULT_SUPPLIER_FAVORITES };
  const o = raw as Record<string, unknown>;
  const strArr = normalizeStringIds;
  const lastUsedAt: Record<string, number> = {};
  if (o.lastUsedAt && typeof o.lastUsedAt === "object") {
    for (const [k, v] of Object.entries(o.lastUsedAt as Record<string, unknown>)) {
      if (typeof v === "number" && Number.isFinite(v)) lastUsedAt[k] = v;
    }
  }
  return {
    favoriteIds: strArr(o.favoriteIds),
    hiddenIds: strArr(o.hiddenIds),
    orderIds: strArr(o.orderIds),
    defaultSupplierId: typeof o.defaultSupplierId === "string" ? o.defaultSupplierId : null,
    lastUsedAt,
  };
}

export async function loadSupplierIntegrationPrefs(): Promise<SupplierIntegrationPrefs> {
  try {
    const raw = await AsyncStorage.getItem(PREFS_KEY);
    if (!raw) return { ...DEFAULT_SUPPLIER_INTEGRATION_PREFS };
    return normalizePrefs(JSON.parse(raw) as unknown);
  } catch {
    return { ...DEFAULT_SUPPLIER_INTEGRATION_PREFS };
  }
}

export async function saveSupplierIntegrationPrefs(prefs: SupplierIntegrationPrefs): Promise<void> {
  await AsyncStorage.setItem(PREFS_KEY, JSON.stringify(prefs));
}

export async function loadSupplierFavorites(): Promise<SupplierFavoritesState> {
  try {
    const raw = await AsyncStorage.getItem(FAVORITES_KEY);
    if (!raw) return { ...DEFAULT_SUPPLIER_FAVORITES };
    return normalizeFavorites(JSON.parse(raw) as unknown);
  } catch {
    return { ...DEFAULT_SUPPLIER_FAVORITES };
  }
}

export async function saveSupplierFavorites(state: SupplierFavoritesState): Promise<void> {
  await AsyncStorage.setItem(FAVORITES_KEY, JSON.stringify(state));
}

export async function recordSupplierLastUsed(supplierId: string): Promise<SupplierFavoritesState> {
  const state = await loadSupplierFavorites();
  const next = {
    ...state,
    lastUsedAt: { ...state.lastUsedAt, [supplierId]: Date.now() },
  };
  await saveSupplierFavorites(next);
  return next;
}

export async function toggleSupplierFavorite(supplierId: string): Promise<SupplierFavoritesState> {
  const state = await loadSupplierFavorites();
  const set = new Set(state.favoriteIds);
  if (set.has(supplierId)) set.delete(supplierId);
  else set.add(supplierId);
  const next = { ...state, favoriteIds: [...set] };
  await saveSupplierFavorites(next);
  return next;
}

export async function setDefaultSupplier(supplierId: string | null): Promise<SupplierFavoritesState> {
  const state = await loadSupplierFavorites();
  const next = { ...state, defaultSupplierId: supplierId };
  await saveSupplierFavorites(next);
  return next;
}
