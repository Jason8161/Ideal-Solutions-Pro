import { dedupeByPreset, loadSavedSupplyHouses } from "@/lib/savedSuppliers";
import {
  DEFAULT_MATERIAL_SUPPLIER_IDS,
  loadSelectedMaterialSupplierIds,
} from "@/lib/materialSupplierPreferences";
import {
  materialSupplierById,
  type MaterialSupplierDefinition,
  type MaterialSupplierId,
} from "@/lib/materialSuppliers";
import {
  isSupplyHousePresetId,
  labelForSupplyHousePreset,
  type SupplyHousePresetId,
} from "@/lib/supplierPresets";

export type MaterialsSearchTile =
  | {
      key: MaterialSupplierId;
      name: string;
      kind: "app";
      appDef: MaterialSupplierDefinition;
    }
  | {
      key: SupplyHousePresetId;
      name: string;
      kind: "web";
      presetId: SupplyHousePresetId;
    };

function tileForId(id: string): MaterialsSearchTile | null {
  const appDef = materialSupplierById(id);
  if (appDef) {
    return { key: appDef.id, name: appDef.name, kind: "app", appDef };
  }
  if (isSupplyHousePresetId(id)) {
    return {
      key: id,
      name: labelForSupplyHousePreset(id),
      kind: "web",
      presetId: id,
    };
  }
  return null;
}

/**
 * Suppliers shown on Materials search — prefers Settings → My supply houses, then
 * Material search suppliers, then Home Depot / Lowe's defaults.
 */
export async function loadMaterialsSearchTiles(): Promise<MaterialsSearchTile[]> {
  const savedPresets = dedupeByPreset(await loadSavedSupplyHouses()).map((r) => r.presetId);
  const materialPrefs = await loadSelectedMaterialSupplierIds();

  const primaryIds =
    savedPresets.length > 0
      ? savedPresets
      : materialPrefs.length > 0
        ? materialPrefs
        : [...DEFAULT_MATERIAL_SUPPLIER_IDS];

  const tiles: MaterialsSearchTile[] = [];
  const seen = new Set<string>();

  for (const id of primaryIds) {
    if (seen.has(id)) continue;
    const tile = tileForId(id);
    if (!tile) continue;
    seen.add(id);
    tiles.push(tile);
  }

  if (savedPresets.length > 0) {
    for (const id of materialPrefs) {
      if (seen.has(id)) continue;
      const tile = tileForId(id);
      if (!tile || tile.kind !== "app") continue;
      seen.add(id);
      tiles.push(tile);
    }
  }

  return tiles;
}

export async function loadMaterialsSearchTileKeys(): Promise<string[]> {
  const tiles = await loadMaterialsSearchTiles();
  return tiles.map((t) => t.key);
}
