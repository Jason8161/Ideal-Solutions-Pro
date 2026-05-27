import AsyncStorage from "@react-native-async-storage/async-storage";

import { loadSelectedMaterialSupplierIds, saveSelectedMaterialSupplierIds } from "@/lib/materialSupplierPreferences";
import { materialSupplierById, type MaterialSupplierId } from "@/lib/materialSuppliers";

const STORAGE_KEY = "ideal_solutions_material_supplier_app_shortcuts_v1";

export const MAX_MATERIAL_SUPPLIER_APP_SHORTCUTS = 8;

/** Default big-box retailers — main grid only, not "Open in app" quick links. */
export const EXCLUDED_MATERIAL_SUPPLIER_QUICK_LINK_IDS: readonly MaterialSupplierId[] = [
  "homedepot",
  "lowes",
] as const;

const EXCLUDED_QUICK_LINK_SET = new Set<string>(EXCLUDED_MATERIAL_SUPPLIER_QUICK_LINK_IDS);

export function canMaterialSupplierBeAppShortcut(id: MaterialSupplierId): boolean {
  return !EXCLUDED_QUICK_LINK_SET.has(id);
}

function isMaterialSupplierId(value: unknown): value is MaterialSupplierId {
  return typeof value === "string" && materialSupplierById(value) != null;
}

function normalizeIds(raw: unknown): MaterialSupplierId[] {
  if (!Array.isArray(raw)) return [];
  const out: MaterialSupplierId[] = [];
  const seen = new Set<string>();
  for (const item of raw) {
    if (!isMaterialSupplierId(item) || seen.has(item) || !canMaterialSupplierBeAppShortcut(item)) continue;
    seen.add(item);
    out.push(item);
    if (out.length >= MAX_MATERIAL_SUPPLIER_APP_SHORTCUTS) break;
  }
  return out;
}

export async function loadMaterialSupplierAppShortcutIds(): Promise<MaterialSupplierId[]> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    const normalized = normalizeIds(parsed);
    if (Array.isArray(parsed)) {
      const hadExcluded = parsed.some(
        (item) => typeof item === "string" && EXCLUDED_QUICK_LINK_SET.has(item),
      );
      if (hadExcluded) {
        await saveMaterialSupplierAppShortcutIds(normalized);
      }
    }
    return normalized;
  } catch {
    return [];
  }
}

export async function saveMaterialSupplierAppShortcutIds(ids: MaterialSupplierId[]): Promise<void> {
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(normalizeIds(ids)));
}

export async function prefersMaterialSupplierApp(key: string): Promise<boolean> {
  const shortcuts = await loadMaterialSupplierAppShortcutIds();
  return shortcuts.includes(key as MaterialSupplierId);
}

/** Remember to open this retailer in its native app (quick link + skip prompts). */
export async function assignMaterialSupplierAppShortcut(id: MaterialSupplierId): Promise<void> {
  if (!canMaterialSupplierBeAppShortcut(id)) return;

  const def = materialSupplierById(id);
  if (!def) return;

  const selected = await loadSelectedMaterialSupplierIds();
  if (!selected.includes(id)) {
    await saveSelectedMaterialSupplierIds([...selected, id]);
  }

  const current = await loadMaterialSupplierAppShortcutIds();
  const next = [id, ...current.filter((x) => x !== id)].slice(0, MAX_MATERIAL_SUPPLIER_APP_SHORTCUTS);
  await saveMaterialSupplierAppShortcutIds(next);
}

export async function removeMaterialSupplierAppShortcut(id: MaterialSupplierId): Promise<void> {
  const current = await loadMaterialSupplierAppShortcutIds();
  await saveMaterialSupplierAppShortcutIds(current.filter((x) => x !== id));
}
