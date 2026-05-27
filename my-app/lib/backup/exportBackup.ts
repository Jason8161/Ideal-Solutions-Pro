import * as FileSystem from "expo-file-system/legacy";
import JSZip from "jszip";

import { saveLatestBackupTimestamp } from "./backupMetaStorage";
import { collectAllAppData } from "./collectAllAppData";
import {
  BACKUP_FILE_EXTENSION,
  BACKUP_FILE_PREFIX,
  BACKUP_MANIFEST_NAME,
  BACKUP_SLACK_BYTES,
  BACKUP_SUBDIR,
  MAX_BACKUP_FILES,
} from "./constants";
import type { BackupListItem, ExportBackupResult } from "./types";

export function formatMegabytes(bytes: number): string {
  const mb = bytes / (1024 * 1024);
  if (mb < 0.01) return "less than 0.01 MB";
  return `${mb.toFixed(mb >= 10 ? 0 : 1)} MB`;
}

function utf8ByteLength(str: string): number {
  if (typeof TextEncoder !== "undefined") {
    return new TextEncoder().encode(str).length;
  }
  return unescape(encodeURIComponent(str)).length;
}

export async function ensureBackupDir(): Promise<string> {
  const base = FileSystem.documentDirectory;
  if (!base) throw new Error("NO_DOCUMENT_DIR");
  const dir = `${base}${BACKUP_SUBDIR}`;
  const info = await FileSystem.getInfoAsync(dir);
  if (!info.exists) {
    await FileSystem.makeDirectoryAsync(dir, { intermediates: true });
  }
  return dir;
}

async function pruneBackups(dir: string): Promise<void> {
  const names = (await FileSystem.readDirectoryAsync(dir))
    .filter((n) => n.startsWith(BACKUP_FILE_PREFIX) && n.endsWith(BACKUP_FILE_EXTENSION))
    .sort((a, b) => b.localeCompare(a));
  for (const name of names.slice(MAX_BACKUP_FILES)) {
    await FileSystem.deleteAsync(`${dir}${name}`, { idempotent: true });
  }
}

type ExportOptions = {
  destDir?: string;
  fileNamePrefix?: string;
  skipMetaUpdate?: boolean;
  skipPrune?: boolean;
};

export async function exportBackup(options: ExportOptions = {}): Promise<ExportBackupResult> {
  let bundle;
  try {
    bundle = await collectAllAppData();
  } catch (e) {
    return {
      ok: false,
      reason: "write_failed",
      message: e instanceof Error ? e.message : "Could not read saved data.",
    };
  }

  const manifestJson = JSON.stringify(bundle, null, 0);
  const zip = new JSZip();
  zip.file(BACKUP_MANIFEST_NAME, manifestJson);

  for (const asset of bundle.assets) {
    try {
      const info = await FileSystem.getInfoAsync(asset.originalUri);
      if (!info.exists) continue;
      const base64 = await FileSystem.readAsStringAsync(asset.originalUri, {
        encoding: FileSystem.EncodingType.Base64,
      });
      zip.file(asset.zipPath, base64, { base64: true });
    } catch {
      /* skip missing asset */
    }
  }

  let zipBase64: string;
  try {
    zipBase64 = await zip.generateAsync({ type: "base64", compression: "DEFLATE", compressionOptions: { level: 6 } });
  } catch (e) {
    return {
      ok: false,
      reason: "write_failed",
      message: e instanceof Error ? e.message : "Could not build backup archive.",
    };
  }

  const sizeBytes = Math.ceil((zipBase64.length * 3) / 4);
  const requiredBytes = sizeBytes + BACKUP_SLACK_BYTES;

  let freeBytes: number | null = null;
  try {
    freeBytes = await FileSystem.getFreeDiskStorageAsync();
  } catch {
    freeBytes = null;
  }
  if (freeBytes != null && freeBytes < requiredBytes) {
    return { ok: false, reason: "low_space", freeBytes, requiredBytes };
  }

  let dir: string;
  try {
    dir = options.destDir ?? (await ensureBackupDir());
  } catch (e) {
    if (e instanceof Error && e.message === "NO_DOCUMENT_DIR") {
      return { ok: false, reason: "no_storage", message: "Backups are not available in this environment." };
    }
    return { ok: false, reason: "write_failed", message: "Could not create the backup folder." };
  }

  const prefix = options.fileNamePrefix ?? BACKUP_FILE_PREFIX;
  const fileName = `${prefix}${Date.now()}${BACKUP_FILE_EXTENSION}`;
  const fileUri = `${dir}${fileName}`;

  try {
    await FileSystem.writeAsStringAsync(fileUri, zipBase64, { encoding: FileSystem.EncodingType.Base64 });
  } catch (e) {
    const code = (e as { code?: string })?.code;
    const msg = String(e);
    if (code === "ENOSPC" || /no space|enospc/i.test(msg)) {
      let fb = freeBytes ?? 0;
      try {
        fb = await FileSystem.getFreeDiskStorageAsync();
      } catch {
        /* ignore */
      }
      return { ok: false, reason: "low_space", freeBytes: fb, requiredBytes };
    }
    return { ok: false, reason: "write_failed", message: e instanceof Error ? e.message : "Save failed." };
  }

  if (!options.skipPrune) {
    await pruneBackups(dir);
  }
  if (!options.skipMetaUpdate) {
    await saveLatestBackupTimestamp(bundle.exportedAt);
  }

  return { ok: true, fileUri, sizeBytes, exportedAt: bundle.exportedAt };
}

export async function listBackupFiles(): Promise<BackupListItem[]> {
  if (!FileSystem.documentDirectory) return [];
  let dir: string;
  try {
    dir = await ensureBackupDir();
  } catch {
    return [];
  }

  const names = (await FileSystem.readDirectoryAsync(dir)).filter(
    (n) => n.startsWith(BACKUP_FILE_PREFIX) && n.endsWith(BACKUP_FILE_EXTENSION),
  );
  names.sort((a, b) => b.localeCompare(a));

  const items: BackupListItem[] = [];
  for (const fileName of names) {
    const fileUri = `${dir}${fileName}`;
    const info = await FileSystem.getInfoAsync(fileUri);
    if (!info.exists) continue;
    items.push({
      fileName,
      fileUri,
      sizeBytes: info.size,
      modificationTime: info.modificationTime ?? null,
      exportedAt: null,
    });
  }
  return items;
}

/** @deprecated Use exportBackup — kept for legacy JSON callers. */
export async function buildBackupJson(): Promise<string> {
  const bundle = await collectAllAppData();
  return JSON.stringify({
    formatVersion: 1,
    appId: bundle.appId,
    exportedAt: bundle.exportedAt,
    entries: bundle.entries,
  });
}
