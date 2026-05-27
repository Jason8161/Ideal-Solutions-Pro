import AsyncStorage from "@react-native-async-storage/async-storage";

/** User-confirmed successful native app opens (not device scanning). */
export const CONFIRMED_SUPPLIER_APP_STORAGE_KEY = "ideal_supplier_confirmed_app_v1";

export type ConfirmedSupplierAppOpens = Record<string, number>;

function normalizeConfirmed(raw: unknown): ConfirmedSupplierAppOpens {
  if (!raw || typeof raw !== "object") return {};
  const out: ConfirmedSupplierAppOpens = {};
  for (const [id, ts] of Object.entries(raw as Record<string, unknown>)) {
    if (typeof id !== "string" || !id.trim()) continue;
    if (typeof ts === "number" && Number.isFinite(ts)) out[id] = ts;
  }
  return out;
}

export async function loadConfirmedSupplierAppOpens(): Promise<ConfirmedSupplierAppOpens> {
  try {
    const raw = await AsyncStorage.getItem(CONFIRMED_SUPPLIER_APP_STORAGE_KEY);
    if (!raw) return {};
    return normalizeConfirmed(JSON.parse(raw) as unknown);
  } catch {
    return {};
  }
}

export async function isSupplierAppConfirmed(supplierId: string): Promise<boolean> {
  if (!supplierId?.trim()) return false;
  const map = await loadConfirmedSupplierAppOpens();
  return typeof map[supplierId] === "number";
}

/** Remember that the user successfully opened this supplier's native app from Ideal Solutions. */
export async function recordSupplierAppConfirmed(supplierId: string): Promise<void> {
  if (!supplierId?.trim()) return;
  const map = await loadConfirmedSupplierAppOpens();
  const next = { ...map, [supplierId]: Date.now() };
  await AsyncStorage.setItem(CONFIRMED_SUPPLIER_APP_STORAGE_KEY, JSON.stringify(next));
}
