import * as Clipboard from "expo-clipboard";
import * as DocumentPicker from "expo-document-picker";
import { readAsStringAsync } from "expo-file-system/legacy";
import { Alert, Platform } from "react-native";

import {
  loadMaterialLines,
  newMaterialLineId,
  parseNoteLines,
  saveMaterialLines,
  type MaterialLine,
} from "@/lib/materialListStorage";

export function offerMaterialListImport(
  lines: string[],
  onApply: (mode: "append" | "replace") => void,
): void {
  if (lines.length === 0) {
    Alert.alert("Nothing to import", "No lines were found. Each non-empty line becomes one list item.");
    return;
  }
  Alert.alert(
    `Import ${lines.length} line${lines.length === 1 ? "" : "s"}?`,
    "Append adds to your current list. Replace clears the list first.",
    [
      { text: "Cancel", style: "cancel" },
      { text: "Append", onPress: () => onApply("append") },
      { text: "Replace list", style: "destructive", onPress: () => onApply("replace") },
    ],
  );
}

export async function mergeMaterialListImport(
  parsed: string[],
  mode: "append" | "replace",
): Promise<MaterialLine[]> {
  const newRows: MaterialLine[] = parsed.map((text) => ({
    id: newMaterialLineId(),
    text,
  }));
  const existing = await loadMaterialLines();
  const next = mode === "replace" ? newRows : [...existing, ...newRows];
  await saveMaterialLines(next);
  return next;
}

async function readTextFromPickedAsset(asset: DocumentPicker.DocumentPickerAsset): Promise<string> {
  if (Platform.OS === "web" && asset.file) {
    return asset.file.text();
  }
  return readAsStringAsync(asset.uri, { encoding: "utf8" });
}

/** Returns parsed lines, or null if the user canceled or an alert was already shown. */
export async function parseMaterialListFromClipboard(): Promise<string[] | null> {
  const has = await Clipboard.hasStringAsync();
  if (!has) {
    Alert.alert(
      "Clipboard empty",
      "In Notes, select your list, tap Copy, then come back here and try again.",
    );
    return null;
  }
  const raw = await Clipboard.getStringAsync();
  return parseNoteLines(raw);
}

/** Returns parsed lines, or null if the user canceled or an alert was already shown. */
export async function parseMaterialListFromFile(): Promise<string[] | null> {
  const result = await DocumentPicker.getDocumentAsync({
    type: ["text/plain", "text/csv", "text/markdown", "public.plain-text", "*/*"],
    copyToCacheDirectory: true,
  });
  if (result.canceled) return null;
  const asset = result.assets[0];
  if (!asset?.uri && !asset?.file) {
    Alert.alert("Could not read file", "Try exporting your note as a .txt file to Files, then pick it again.");
    return null;
  }
  try {
    const raw = await readTextFromPickedAsset(asset);
    return parseNoteLines(raw);
  } catch {
    Alert.alert(
      "Could not read file",
      "Pick a plain text file (.txt) or export your note from Notes as text.",
    );
    return null;
  }
}

export function promptMaterialListImport(
  parsed: string[],
  onApplied: (mode: "append" | "replace", next: MaterialLine[]) => void | Promise<void>,
): void {
  offerMaterialListImport(parsed, (mode) => {
    void mergeMaterialListImport(parsed, mode).then((next) => onApplied(mode, next));
  });
}
