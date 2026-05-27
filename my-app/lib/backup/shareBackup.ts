import * as Sharing from "expo-sharing";

import { exportBackup } from "./exportBackup";
import type { ExportBackupResult } from "./types";

export type SaveBackupToDeviceResult =
  | { ok: true; fileUri: string; sizeBytes: number; exportedAt: string; shared: boolean }
  | Exclude<ExportBackupResult, { ok: true }>
  | { ok: false; reason: "share_unavailable"; fileUri: string; sizeBytes: number; exportedAt: string }
  | { ok: false; reason: "share_failed"; message: string; fileUri: string; sizeBytes: number; exportedAt: string };

/**
 * Creates a backup ZIP in app storage, then opens the OS share/save sheet so the user
 * can store the file in Downloads, Files, OneDrive, or email — outside the app sandbox.
 */
export async function saveBackupToDevice(): Promise<SaveBackupToDeviceResult> {
  const result = await exportBackup();
  if (!result.ok) return result;

  const canShare = await Sharing.isAvailableAsync();
  if (!canShare) {
    return {
      ok: false,
      reason: "share_unavailable",
      fileUri: result.fileUri,
      sizeBytes: result.sizeBytes,
      exportedAt: result.exportedAt,
    };
  }

  try {
    await Sharing.shareAsync(result.fileUri, {
      mimeType: "application/zip",
      dialogTitle: "Save Ideal Solutions Pro backup",
      UTI: "com.pkware.zip-archive",
    });
    return { ok: true, ...result, shared: true };
  } catch (e) {
    return {
      ok: false,
      reason: "share_failed",
      message: e instanceof Error ? e.message : "Could not open the save dialog.",
      fileUri: result.fileUri,
      sizeBytes: result.sizeBytes,
      exportedAt: result.exportedAt,
    };
  }
}
