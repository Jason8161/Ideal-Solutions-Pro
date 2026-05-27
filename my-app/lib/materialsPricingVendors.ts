import { dedupeByPreset, loadSavedSupplyHouses } from "@/lib/savedSuppliers";
import { isSupplyHousePresetId, type SupplyHousePresetId } from "@/lib/supplierPresets";

/**
 * When the user has not added any supply houses under Settings → My supply houses,
 * Materials search and “price materials” use this vendor grid.
 */
export const MATERIAL_PRICING_FALLBACK_VENDORS: readonly SupplyHousePresetId[] = [
  "homedepot",
  "lowes",
  "cityelectric",
  "graybar",
  "rexel",
  "grainger",
] as const;

/**
 * Use only the user’s saved supply houses when they have at least one; otherwise the
 * standard fallback list. Order matches the user’s list (deduped by preset).
 */
export function resolveVendorPresetsForMaterialPricing(savedPresetIds: SupplyHousePresetId[]): SupplyHousePresetId[] {
  const deduped: SupplyHousePresetId[] = [];
  const seen = new Set<string>();
  for (const id of savedPresetIds) {
    if (!isSupplyHousePresetId(id)) continue;
    if (seen.has(id)) continue;
    seen.add(id);
    deduped.push(id);
  }
  return deduped.length > 0 ? deduped : [...MATERIAL_PRICING_FALLBACK_VENDORS];
}

export async function loadVendorPresetsForMaterialPricing(): Promise<SupplyHousePresetId[]> {
  const rows = await loadSavedSupplyHouses();
  const saved = dedupeByPreset(rows).map((r) => r.presetId);
  return resolveVendorPresetsForMaterialPricing(saved);
}
