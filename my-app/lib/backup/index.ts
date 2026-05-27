export {
  BACKUP_APP_ID,
  BACKUP_FILE_EXTENSION,
  BACKUP_FORMAT_VERSION,
  BACKUP_SUBDIR,
  LEGACY_BACKUP_EXTENSION,
} from "./constants";

export { collectAllAppData, hasSignificantAppData, isAppBackupKey } from "./collectAllAppData";
export { validateBackupJson } from "./validateBackup";
export { createRestoreCheckpoint } from "./checkpointStorage";
export { exportBackup, listBackupFiles, formatMegabytes, buildBackupJson, ensureBackupDir } from "./exportBackup";
export { saveBackupToDevice } from "./shareBackup";
export type { SaveBackupToDeviceResult } from "./shareBackup";
export { importBackup, importBackupWithConfirmation, restoreLocalBackupFromJsonFileUri } from "./importBackup";
export { loadLatestBackupTimestamp, saveLatestBackupTimestamp } from "./backupMetaStorage";
export {
  getCurrentAppVersion,
  shouldShowPreUpdateBackupModal,
  shouldShowRestorePrompt,
  markUpdateBackupAcknowledged,
  markRestorePromptSeen,
  loadLastSeenAppVersion,
} from "./appVersionStorage";
export { defaultBackupCloudProvider } from "./cloudProvider";

export type {
  BackupBundle,
  BackupListItem,
  BackupValidationResult,
  ExportBackupResult,
  ImportBackupProgress,
  ImportBackupResult,
  BackupCloudProvider,
} from "./types";

/** Microsoft OneDrive product page (free storage / install options). */
export const ONEDRIVE_INFO_URL =
  "https://www.microsoft.com/microsoft-365/onedrive/online-cloud-storage";

export type CreateBackupResult = import("./types").ExportBackupResult;
