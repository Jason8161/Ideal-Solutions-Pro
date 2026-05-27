export const BACKUP_APP_ID = "ideal-solutions";
/** ZIP bundle format (v2). Legacy JSON-only exports use formatVersion 1. */
export const BACKUP_FORMAT_VERSION = 2;
export const LEGACY_BACKUP_FORMAT_VERSION = 1;

export const BACKUP_SUBDIR = "backups/";
export const CHECKPOINT_SUBDIR = "backups/checkpoints/";
export const BACKUP_FILE_PREFIX = "ideal-solutions-backup-";
export const BACKUP_FILE_EXTENSION = ".idealbackup.zip";
export const LEGACY_BACKUP_EXTENSION = ".json";

export const BACKUP_MANIFEST_NAME = "backup.json";
export const BACKUP_ASSETS_DIR = "assets/";

export const MAX_BACKUP_FILES = 8;
export const MAX_CHECKPOINT_FILES = 3;
/** Extra headroom so a full write succeeds after the OS reports free space. */
export const BACKUP_SLACK_BYTES = 512 * 1024;

export const ASSET_URI_PREFIX = "__BACKUP_ASSET__:";

export const LAST_SEEN_APP_VERSION_KEY = "ideal_solutions_last_seen_app_version_v1";
export const UPDATE_BACKUP_ACK_VERSION_KEY = "ideal_solutions_update_backup_ack_v1";
export const RESTORE_PROMPT_SEEN_KEY = "ideal_solutions_restore_prompt_seen_v1";
export const LATEST_BACKUP_AT_KEY = "ideal_solutions_latest_backup_at_v1";
