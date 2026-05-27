import type { BackupCloudProvider } from "./types";

/** Phase 2: plug in iCloud, Google Drive, or Ideal Solutions cloud sync. */
export class NoOpBackupCloudProvider implements BackupCloudProvider {
  readonly id = "none";
  readonly displayName = "Cloud backup (coming soon)";

  async isAvailable(): Promise<boolean> {
    return false;
  }

  async uploadBackup(_localFileUri: string): Promise<{ remoteId: string }> {
    throw new Error("Cloud backup is not configured.");
  }

  async listRemoteBackups(): Promise<{ remoteId: string; exportedAt: string; sizeBytes: number }[]> {
    return [];
  }

  async downloadBackup(_remoteId: string, _localDestUri: string): Promise<void> {
    throw new Error("Cloud backup is not configured.");
  }
}

export const defaultBackupCloudProvider: BackupCloudProvider = new NoOpBackupCloudProvider();
