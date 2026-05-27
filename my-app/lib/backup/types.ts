import { BACKUP_APP_ID, BACKUP_FORMAT_VERSION } from "./constants";

export type BackupAssetEntry = {
  zipPath: string;
  originalUri: string;
  sizeBytes?: number;
};

export type BackupBundle = {
  formatVersion: typeof BACKUP_FORMAT_VERSION;
  appId: typeof BACKUP_APP_ID;
  exportedAt: string;
  appVersion: string;
  entries: Record<string, string>;
  assets: BackupAssetEntry[];
  /** Human-readable summary for settings UI. */
  includedDomains: BackupDataDomain[];
};

export type BackupDataDomain =
  | "profile"
  | "bossJobs"
  | "estimates"
  | "employees"
  | "invoices"
  | "calendar"
  | "aiProjects"
  | "settings"
  | "materialLists"
  | "serviceCalls"
  | "images";

export type LegacyBackupBundle = {
  formatVersion: 1;
  appId: string;
  exportedAt: string;
  entries: Record<string, string>;
};

export type ParsedBackup =
  | { kind: "zip"; bundle: BackupBundle }
  | { kind: "legacy-json"; bundle: LegacyBackupBundle };

export type BackupValidationResult =
  | { ok: true; parsed: ParsedBackup }
  | { ok: false; reason: string };

export type ExportBackupResult =
  | { ok: true; fileUri: string; sizeBytes: number; exportedAt: string }
  | { ok: false; reason: "low_space"; freeBytes: number; requiredBytes: number }
  | { ok: false; reason: "no_storage"; message: string }
  | { ok: false; reason: "write_failed"; message: string };

export type ImportBackupProgress = {
  phase: "reading" | "validating" | "checkpoint" | "extracting" | "restoring" | "done";
  message: string;
  percent: number;
};

export type ImportBackupResult =
  | { ok: true; restoredKeys: number; restoredAssets: number; checkpointUri: string | null }
  | { ok: false; reason: string };

export type BackupListItem = {
  fileName: string;
  fileUri: string;
  sizeBytes: number;
  modificationTime: number | null;
  exportedAt: string | null;
};

export interface BackupCloudProvider {
  readonly id: string;
  readonly displayName: string;
  isAvailable(): Promise<boolean>;
  uploadBackup(localFileUri: string): Promise<{ remoteId: string }>;
  listRemoteBackups(): Promise<{ remoteId: string; exportedAt: string; sizeBytes: number }[]>;
  downloadBackup(remoteId: string, localDestUri: string): Promise<void>;
}
