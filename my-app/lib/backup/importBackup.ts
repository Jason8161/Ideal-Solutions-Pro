import * as FileSystem from "expo-file-system/legacy";
import JSZip from "jszip";

import { resolveAssetDestUri } from "./assetRestorePaths";
import { isAppBackupKey } from "./collectAllAppData";
import { createRestoreCheckpoint } from "./checkpointStorage";
import { ASSET_URI_PREFIX, BACKUP_MANIFEST_NAME } from "./constants";
import {
  applyRestoredEntries,
  clearRestorableAppKeys,
  stripUnresolvedAssetPlaceholders,
} from "./restoreStorage";
import type { ImportBackupProgress, ImportBackupResult } from "./types";
import { validateBackupJson } from "./validateBackup";

function replaceAssetPlaceholders(value: string, zipPathToUri: Map<string, string>): string {
  let next = value;
  for (const [zipPath, uri] of zipPathToUri) {
    const token = `${ASSET_URI_PREFIX}${zipPath}`;
    if (next.includes(token)) {
      next = next.split(token).join(uri);
    }
  }
  return stripUnresolvedAssetPlaceholders(next);
}

async function readFileAsBase64(uri: string): Promise<string> {
  return FileSystem.readAsStringAsync(uri, { encoding: FileSystem.EncodingType.Base64 });
}

function looksLikeZipPath(fileUri: string): boolean {
  const lower = fileUri.toLowerCase();
  return lower.endsWith(".zip") || lower.endsWith(".idealbackup.zip");
}

function looksLikeJsonPath(fileUri: string): boolean {
  return fileUri.toLowerCase().endsWith(".json");
}

async function parseZipBackup(
  fileUri: string,
): Promise<{ manifest: unknown; zip: JSZip } | { error: string }> {
  let base64: string;
  try {
    base64 = await readFileAsBase64(fileUri);
  } catch {
    return { error: "Could not read the backup file." };
  }

  if (base64.length < 4) {
    return { error: "That file is empty or too small to be a backup." };
  }

  let zip: JSZip;
  try {
    zip = await JSZip.loadAsync(base64, { base64: true });
  } catch {
    return { error: "That file is not a valid backup archive." };
  }

  const manifestFile = zip.file(BACKUP_MANIFEST_NAME) ?? zip.file(`/${BACKUP_MANIFEST_NAME}`);
  if (!manifestFile) {
    return { error: "Backup archive is missing backup.json." };
  }

  let manifestRaw: string;
  try {
    manifestRaw = await manifestFile.async("string");
  } catch {
    return { error: "Could not read backup.json from the archive." };
  }

  let manifest: unknown;
  try {
    manifest = JSON.parse(manifestRaw) as unknown;
  } catch {
    return { error: "backup.json is not valid JSON." };
  }

  return { manifest, zip };
}

async function parseLegacyJsonBackup(fileUri: string): Promise<{ manifest: unknown } | { error: string }> {
  let raw: string;
  try {
    raw = await FileSystem.readAsStringAsync(fileUri, { encoding: FileSystem.EncodingType.UTF8 });
  } catch {
    return { error: "Could not read the backup file." };
  }
  const trimmed = raw.trim();
  if (!trimmed.startsWith("{")) {
    return { error: "That file is not valid JSON." };
  }
  try {
    return { manifest: JSON.parse(trimmed) as unknown };
  } catch {
    return { error: "That file is not valid JSON." };
  }
}

async function readBackupManifest(
  fileUri: string,
): Promise<
  | { manifest: unknown; zip: JSZip | null; kind: "zip" | "legacy-json" }
  | { error: string }
> {
  const isExplicitJson = looksLikeJsonPath(fileUri) && !looksLikeZipPath(fileUri);
  const isExplicitZip = looksLikeZipPath(fileUri);

  if (!isExplicitJson) {
    const zipResult = await parseZipBackup(fileUri);
    if (!("error" in zipResult)) {
      return { manifest: zipResult.manifest, zip: zipResult.zip, kind: "zip" };
    }
    if (isExplicitZip) return zipResult;
  }

  const jsonResult = await parseLegacyJsonBackup(fileUri);
  if ("error" in jsonResult) {
    return {
      error: isExplicitZip
        ? jsonResult.error
        : "Could not read this backup. Use a .idealbackup.zip or legacy .json file.",
    };
  }
  return { manifest: jsonResult.manifest, zip: null, kind: "legacy-json" };
}

async function extractAssetsFromZip(
  zip: JSZip,
  assets: { zipPath: string; originalUri: string }[],
): Promise<Map<string, string>> {
  const zipPathToUri = new Map<string, string>();
  if (!FileSystem.documentDirectory) return zipPathToUri;

  for (const asset of assets) {
    if (!asset.zipPath) continue;

    try {
      const file = zip.file(asset.zipPath) ?? zip.file(asset.zipPath.replace(/^\/+/, ""));
      if (!file) continue;

      const destUri = resolveAssetDestUri(asset.originalUri, asset.zipPath);
      if (!destUri) continue;

      const parent = destUri.replace(/[^/]+$/, "");
      const parentInfo = await FileSystem.getInfoAsync(parent);
      if (!parentInfo.exists) {
        await FileSystem.makeDirectoryAsync(parent, { intermediates: true });
      }

      const base64 = await file.async("base64");
      await FileSystem.writeAsStringAsync(destUri, base64, {
        encoding: FileSystem.EncodingType.Base64,
      });
      zipPathToUri.set(asset.zipPath, destUri);
    } catch {
      /* skip asset — placeholders stripped from entries later */
    }
  }
  return zipPathToUri;
}

export async function importBackup(
  fileUri: string,
  onProgress?: (progress: ImportBackupProgress) => void,
): Promise<ImportBackupResult> {
  const report = (phase: ImportBackupProgress["phase"], message: string, percent: number) => {
    onProgress?.({ phase, message, percent });
  };

  report("reading", "Reading backup file…", 5);

  const readResult = await readBackupManifest(fileUri);
  if ("error" in readResult) return { ok: false, reason: readResult.error };

  const { manifest, zip, kind: detectedKind } = readResult;

  report("validating", "Validating backup…", 20);
  const validation = validateBackupJson(manifest);
  if (!validation.ok) return { ok: false, reason: validation.reason };

  const parsedKind = validation.parsed.kind;
  if (parsedKind === "zip" && detectedKind === "legacy-json") {
    return {
      ok: false,
      reason: "This JSON backup is not a ZIP archive. Choose the .idealbackup.zip file if you have one.",
    };
  }
  if (parsedKind === "zip" && !zip) {
    return { ok: false, reason: "Could not open the backup archive." };
  }

  report("checkpoint", "Saving checkpoint before restore…", 35);
  let checkpointUri: string | null = null;
  try {
    checkpointUri = await createRestoreCheckpoint();
  } catch {
    checkpointUri = null;
  }

  report("extracting", "Extracting files…", 55);
  let zipPathToUri = new Map<string, string>();
  if (validation.parsed.kind === "zip" && zip) {
    try {
      zipPathToUri = await extractAssetsFromZip(zip, validation.parsed.bundle.assets);
    } catch {
      zipPathToUri = new Map();
    }
  }

  report("restoring", "Restoring app data…", 75);

  const entries =
    validation.parsed.kind === "zip"
      ? validation.parsed.bundle.entries
      : validation.parsed.bundle.entries;

  const pairs: [string, string][] = [];
  for (const [k, v] of Object.entries(entries)) {
    if (!isAppBackupKey(k)) continue;
    if (typeof v !== "string") continue;
    pairs.push([k, replaceAssetPlaceholders(v, zipPathToUri)]);
  }

  if (pairs.length === 0) {
    return { ok: false, reason: "No restorable entries in this backup." };
  }

  try {
    await clearRestorableAppKeys();
    await applyRestoredEntries(pairs);
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Could not write restored data to this device.";
    return { ok: false, reason: `Restore failed while saving data: ${msg}` };
  }

  report("done", "Restore complete.", 100);

  return {
    ok: true,
    restoredKeys: pairs.length,
    restoredAssets: zipPathToUri.size,
    checkpointUri,
  };
}

/** Legacy JSON-only restore (no ZIP). */
export async function restoreLocalBackupFromJsonFileUri(fileUri: string): Promise<void> {
  const result = await importBackup(fileUri);
  if (!result.ok) throw new Error(result.reason);
}

export async function importBackupWithConfirmation(
  fileUri: string,
  confirmed: boolean,
  onProgress?: (progress: ImportBackupProgress) => void,
): Promise<ImportBackupResult> {
  if (!confirmed) {
    return { ok: false, reason: "Restore cancelled — confirmation required." };
  }
  return importBackup(fileUri, onProgress);
}
