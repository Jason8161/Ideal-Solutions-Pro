import {
  BACKUP_APP_ID,
  BACKUP_FORMAT_VERSION,
  BACKUP_MANIFEST_NAME,
  LEGACY_BACKUP_FORMAT_VERSION,
} from "./constants";
import type { BackupBundle, BackupValidationResult, LegacyBackupBundle, ParsedBackup } from "./types";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function normalizeFormatVersion(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim() !== "") {
    const n = Number(value);
    return Number.isFinite(n) ? n : null;
  }
  return null;
}

function validateLegacyBundle(raw: unknown): LegacyBackupBundle | null {
  if (!isRecord(raw)) return null;
  if (normalizeFormatVersion(raw.formatVersion) !== LEGACY_BACKUP_FORMAT_VERSION) return null;
  if (raw.appId !== BACKUP_APP_ID) return null;
  if (!isRecord(raw.entries)) return null;
  const entries: Record<string, string> = {};
  for (const [k, v] of Object.entries(raw.entries)) {
    if (typeof v !== "string") continue;
    entries[k] = v;
  }
  if (Object.keys(entries).length === 0) return null;
  return {
    formatVersion: LEGACY_BACKUP_FORMAT_VERSION,
    appId: BACKUP_APP_ID,
    exportedAt: typeof raw.exportedAt === "string" ? raw.exportedAt : new Date(0).toISOString(),
    entries,
  };
}

function validateZipBundle(raw: unknown): BackupBundle | null {
  if (!isRecord(raw)) return null;
  if (normalizeFormatVersion(raw.formatVersion) !== BACKUP_FORMAT_VERSION) return null;
  if (raw.appId !== BACKUP_APP_ID) return null;
  if (!isRecord(raw.entries)) return null;

  const entries: Record<string, string> = {};
  for (const [k, v] of Object.entries(raw.entries)) {
    if (typeof v !== "string") continue;
    entries[k] = v;
  }
  if (Object.keys(entries).length === 0) return null;

  const assets = Array.isArray(raw.assets)
    ? raw.assets
        .filter(isRecord)
        .map((row) => ({
          zipPath: typeof row.zipPath === "string" ? row.zipPath : "",
          originalUri: typeof row.originalUri === "string" ? row.originalUri : "",
          sizeBytes: typeof row.sizeBytes === "number" ? row.sizeBytes : undefined,
        }))
        .filter((row) => row.zipPath.length > 0 && !row.zipPath.includes(".."))
    : [];

  const includedDomains = Array.isArray(raw.includedDomains)
    ? raw.includedDomains.filter((d): d is BackupBundle["includedDomains"][number] => typeof d === "string")
    : [];

  return {
    formatVersion: BACKUP_FORMAT_VERSION,
    appId: BACKUP_APP_ID,
    exportedAt: typeof raw.exportedAt === "string" ? raw.exportedAt : new Date(0).toISOString(),
    appVersion: typeof raw.appVersion === "string" ? raw.appVersion : "unknown",
    entries,
    assets,
    includedDomains,
  };
}

export function validateBackupJson(raw: unknown): BackupValidationResult {
  const zipBundle = validateZipBundle(raw);
  if (zipBundle) {
    return { ok: true, parsed: { kind: "zip", bundle: zipBundle } };
  }
  const legacy = validateLegacyBundle(raw);
  if (legacy) {
    return { ok: true, parsed: { kind: "legacy-json", bundle: legacy } };
  }
  return { ok: false, reason: "That file is not a valid Ideal Solutions Pro backup." };
}

export function validateBackupManifestFileName(name: string): boolean {
  return name === BACKUP_MANIFEST_NAME || name.endsWith("/backup.json");
}
