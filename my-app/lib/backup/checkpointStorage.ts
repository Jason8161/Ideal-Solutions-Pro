import * as FileSystem from "expo-file-system/legacy";

import {
  BACKUP_FILE_PREFIX,
  CHECKPOINT_SUBDIR,
  LEGACY_BACKUP_EXTENSION,
  MAX_CHECKPOINT_FILES,
} from "./constants";
import { exportBackup } from "./exportBackup";

export async function ensureCheckpointDir(): Promise<string> {
  const base = FileSystem.documentDirectory;
  if (!base) throw new Error("NO_DOCUMENT_DIR");
  const dir = `${base}${CHECKPOINT_SUBDIR}`;
  const info = await FileSystem.getInfoAsync(dir);
  if (!info.exists) {
    await FileSystem.makeDirectoryAsync(dir, { intermediates: true });
  }
  return dir;
}

async function pruneCheckpoints(dir: string): Promise<void> {
  const names = (await FileSystem.readDirectoryAsync(dir))
    .filter((n) => n.startsWith(`${BACKUP_FILE_PREFIX}checkpoint-`))
    .sort((a, b) => b.localeCompare(a));
  for (const name of names.slice(MAX_CHECKPOINT_FILES)) {
    await FileSystem.deleteAsync(`${dir}${name}`, { idempotent: true });
  }
}

/** Saves a local checkpoint ZIP before destructive restore. Returns null if checkpoint could not be created. */
export async function createRestoreCheckpoint(): Promise<string | null> {
  try {
    const result = await exportBackup({
      destDir: await ensureCheckpointDir(),
      fileNamePrefix: `${BACKUP_FILE_PREFIX}checkpoint-`,
      skipMetaUpdate: true,
      skipPrune: true,
    });
    if (!result.ok) return null;
    await pruneCheckpoints(await ensureCheckpointDir());
    return result.fileUri;
  } catch {
    return null;
  }
}

export function isLegacyCheckpointJson(fileName: string): boolean {
  return fileName.startsWith("ideal-backup-") && fileName.endsWith(LEGACY_BACKUP_EXTENSION);
}
