import AsyncStorage from "@react-native-async-storage/async-storage";

import type { MaterialLine } from "@/lib/materialListStorage";
import { newMaterialLineId } from "@/lib/materialListStorage";

const SAVED_MATERIAL_LISTS_KEY = "ideal_solutions_saved_material_lists_v1";

export type SavedMaterialList = {
  id: string;
  name: string;
  items: MaterialLine[];
  createdAt: string;
};

function newSavedListId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;
}

function snapshotLines(lines: MaterialLine[]): MaterialLine[] {
  return lines.map((row) => ({ id: row.id, text: row.text }));
}

function isSavedMaterialList(row: unknown): row is SavedMaterialList {
  if (typeof row !== "object" || row === null) return false;
  const r = row as SavedMaterialList;
  if (typeof r.id !== "string" || typeof r.name !== "string" || typeof r.createdAt !== "string") {
    return false;
  }
  if (!Array.isArray(r.items)) return false;
  return r.items.every(
    (item) =>
      typeof item === "object" &&
      item !== null &&
      typeof (item as MaterialLine).id === "string" &&
      typeof (item as MaterialLine).text === "string",
  );
}

async function loadAllSavedLists(): Promise<SavedMaterialList[]> {
  try {
    const raw = await AsyncStorage.getItem(SAVED_MATERIAL_LISTS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(isSavedMaterialList);
  } catch {
    return [];
  }
}

async function saveAllSavedLists(lists: SavedMaterialList[]): Promise<void> {
  await AsyncStorage.setItem(SAVED_MATERIAL_LISTS_KEY, JSON.stringify(lists));
}

export function defaultSavedMaterialListName(): string {
  const d = new Date();
  return `List ${d.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  })}`;
}

export function formatSavedMaterialListDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  } catch {
    return iso;
  }
}

export async function loadSavedMaterialLists(): Promise<SavedMaterialList[]> {
  const rows = await loadAllSavedLists();
  return rows.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export async function getSavedMaterialListById(id: string): Promise<SavedMaterialList | null> {
  const rows = await loadAllSavedLists();
  return rows.find((r) => r.id === id) ?? null;
}

export async function saveMaterialListSnapshot(name: string, items: MaterialLine[]): Promise<SavedMaterialList> {
  const trimmed = name.trim() || defaultSavedMaterialListName();
  const record: SavedMaterialList = {
    id: newSavedListId(),
    name: trimmed,
    createdAt: new Date().toISOString(),
    items: snapshotLines(items),
  };
  const rows = await loadAllSavedLists();
  rows.push(record);
  await saveAllSavedLists(rows);
  return record;
}

export async function deleteSavedMaterialList(id: string): Promise<boolean> {
  const rows = await loadAllSavedLists();
  const next = rows.filter((r) => r.id !== id);
  if (next.length === rows.length) return false;
  await saveAllSavedLists(next);
  return true;
}

export async function renameSavedMaterialList(id: string, name: string): Promise<SavedMaterialList | null> {
  const trimmed = name.trim();
  if (!trimmed) return null;
  const rows = await loadAllSavedLists();
  const idx = rows.findIndex((r) => r.id === id);
  if (idx < 0) return null;
  const updated: SavedMaterialList = { ...rows[idx], name: trimmed };
  rows[idx] = updated;
  await saveAllSavedLists(rows);
  return updated;
}

/** Fresh ids so loaded lines do not collide with existing rows. */
export function materialLinesFromSnapshot(items: MaterialLine[]): MaterialLine[] {
  return items.map((row) => ({
    id: newMaterialLineId(),
    text: row.text,
  }));
}
