import AsyncStorage from "@react-native-async-storage/async-storage";

import {
  MATERIAL_SUPPLIER_CATALOG,
  materialSupplierById,
  type MaterialSupplierDefinition,
  type MaterialSupplierId,
} from "@/lib/materialSuppliers";

const STORAGE_KEY = "ideal_solutions_material_supplier_ids_v1";

export const DEFAULT_MATERIAL_SUPPLIER_IDS: readonly MaterialSupplierId[] = ["homedepot", "lowes"];

function isMaterialSupplierId(value: unknown): value is MaterialSupplierId {
  return typeof value === "string" && MATERIAL_SUPPLIER_CATALOG.some((s) => s.id === value);
}

function normalizeIds(raw: unknown): MaterialSupplierId[] {
  if (!Array.isArray(raw)) return [...DEFAULT_MATERIAL_SUPPLIER_IDS];
  const out: MaterialSupplierId[] = [];
  const seen = new Set<string>();
  for (const item of raw) {
    if (!isMaterialSupplierId(item) || seen.has(item)) continue;
    seen.add(item);
    out.push(item);
  }
  return out.length > 0 ? out : [...DEFAULT_MATERIAL_SUPPLIER_IDS];
}

export async function loadSelectedMaterialSupplierIds(): Promise<MaterialSupplierId[]> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    if (!raw) return [...DEFAULT_MATERIAL_SUPPLIER_IDS];
    return normalizeIds(JSON.parse(raw) as unknown);
  } catch {
    return [...DEFAULT_MATERIAL_SUPPLIER_IDS];
  }
}

export async function saveSelectedMaterialSupplierIds(ids: MaterialSupplierId[]): Promise<void> {
  const normalized = normalizeIds(ids);
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(normalized));
}

export function selectedMaterialSuppliers(ids: MaterialSupplierId[]): MaterialSupplierDefinition[] {
  return ids
    .map((id) => materialSupplierById(id))
    .filter((s): s is MaterialSupplierDefinition => s != null);
}

export function catalogSuppliersNotSelected(selected: MaterialSupplierId[]): MaterialSupplierDefinition[] {
  const set = new Set(selected);
  return MATERIAL_SUPPLIER_CATALOG.filter((s) => !set.has(s.id));
}
