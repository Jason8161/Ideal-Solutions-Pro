import AsyncStorage from "@react-native-async-storage/async-storage";

const STORAGE_KEY = "ideal_solutions_material_list_v1";

export type MaterialLine = {
  id: string;
  text: string;
};

export function newMaterialLineId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

export async function loadMaterialLines(): Promise<MaterialLine[]> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (row): row is MaterialLine =>
        typeof row === "object" &&
        row !== null &&
        typeof (row as MaterialLine).id === "string" &&
        typeof (row as MaterialLine).text === "string",
    );
  } catch {
    return [];
  }
}

export async function saveMaterialLines(lines: MaterialLine[]): Promise<void> {
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(lines));
}

/** Normalize lines copied from Apple Notes, bullets, etc. */
export function parseNoteLines(raw: string): string[] {
  return raw
    .split(/\r?\n/)
    .map((line) =>
      line
        .replace(/^[\t\s]*[\u2022\u2023\u25E6\u2043\u2219\-\*•]+\s*/u, "")
        .trim(),
    )
    .filter((line) => line.length > 0);
}
