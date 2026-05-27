/**
 * Local-first media policy — photos/videos/PDFs stay on device.
 * External backup (iCloud, OneDrive, etc.) is user-managed outside the app.
 */

export type ExternalBackupProvider =
  | "icloud"
  | "onedrive"
  | "google_drive"
  | "dropbox"
  | "none"
  | "other";

export type StorageBackupPreferences = {
  usesExternalBackup: boolean | null;
  providers: ExternalBackupProvider[];
  acknowledgedLocalOnly: boolean;
  updatedAt: string | null;
};

export const STORAGE_BACKUP_STORAGE_KEY = "ideal_storage_backup_prefs_v1";

export const EXTERNAL_BACKUP_OPTIONS: {
  id: ExternalBackupProvider;
  label: string;
  recommend: boolean;
}[] = [
  { id: "icloud", label: "iCloud", recommend: true },
  { id: "onedrive", label: "OneDrive", recommend: true },
  { id: "google_drive", label: "Google Drive", recommend: true },
  { id: "dropbox", label: "Dropbox", recommend: true },
  { id: "other", label: "Other cloud backup", recommend: false },
  { id: "none", label: "I don't use cloud backup yet", recommend: false },
];

export const LOCAL_ONLY_DISCLAIMER =
  "Ideal Solutions Pro stores photos, videos, and PDFs on this device only. We do not upload your job media to our servers. Enable backup in iCloud, OneDrive, Google Drive, or Dropbox so you don't lose files if you replace your phone.";

export function defaultStorageBackupPreferences(): StorageBackupPreferences {
  return {
    usesExternalBackup: null,
    providers: [],
    acknowledgedLocalOnly: false,
    updatedAt: null,
  };
}

/** App must never upload job photos/videos/PDFs to Supabase or app cloud storage. */
export function assertLocalOnlyMediaPath(_uri: string): void {
  // Intentionally empty — policy enforced at pick/save sites; hook for future audits.
}

export function shouldRecommendExternalBackup(prefs: StorageBackupPreferences): boolean {
  if (prefs.acknowledgedLocalOnly && prefs.usesExternalBackup === true) return false;
  if (prefs.usesExternalBackup === false) return true;
  if (prefs.providers.includes("none")) return true;
  return prefs.usesExternalBackup === null;
}
