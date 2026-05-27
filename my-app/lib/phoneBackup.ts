/**
 * @deprecated Import from `@/lib/backup` instead. Kept for legacy imports.
 */
export {
  exportBackup as createLocalBackup,
  exportBackup,
  listBackupFiles,
  formatMegabytes,
  buildBackupJson,
  restoreLocalBackupFromJsonFileUri,
  ONEDRIVE_INFO_URL,
} from "./backup";

export type { BackupListItem, CreateBackupResult } from "./backup";
