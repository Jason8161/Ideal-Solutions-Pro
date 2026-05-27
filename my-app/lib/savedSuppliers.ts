import AsyncStorage from "@react-native-async-storage/async-storage";

import type { SupplyHousePresetId } from "@/lib/supplierPresets";
import { isSupplyHousePresetId } from "@/lib/supplierPresets";

const STORAGE_KEY = "ideal_solutions_saved_supply_houses_v1";

export type SavedSupplyHouse = {
  id: string;
  presetId: SupplyHousePresetId;
};

export function newSupplyHouseRowId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

function parseRows(raw: string | null): SavedSupplyHouse[] {
  if (!raw) return [];
  try {
    const data = JSON.parse(raw) as unknown;
    if (!Array.isArray(data)) return [];
    const out: SavedSupplyHouse[] = [];
    for (const row of data) {
      if (!row || typeof row !== "object") continue;
      const id = (row as { id?: unknown }).id;
      const presetId = (row as { presetId?: unknown }).presetId;
      if (typeof id !== "string" || typeof presetId !== "string") continue;
      if (!isSupplyHousePresetId(presetId)) continue;
      out.push({ id, presetId });
    }
    return out;
  } catch {
    return [];
  }
}

export async function loadSavedSupplyHouses(): Promise<SavedSupplyHouse[]> {
  const raw = await AsyncStorage.getItem(STORAGE_KEY);
  return parseRows(raw);
}

export async function saveSavedSupplyHouses(rows: SavedSupplyHouse[]): Promise<void> {
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(rows));
}

/** One entry per preset (first wins). */
export function dedupeByPreset(rows: SavedSupplyHouse[]): SavedSupplyHouse[] {
  const seen = new Set<string>();
  const out: SavedSupplyHouse[] = [];
  for (const r of rows) {
    if (seen.has(r.presetId)) continue;
    seen.add(r.presetId);
    out.push(r);
  }
  return out;
}
