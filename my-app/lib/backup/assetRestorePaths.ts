import * as FileSystem from "expo-file-system/legacy";

import { BACKUP_ASSETS_DIR } from "./constants";

/** Subdirectories under documentDirectory that hold user images in backups. */
const KNOWN_DOC_SUBDIRS = [
  "button-images/",
  "home-tile-overrides/",
  "company-logos/",
  BACKUP_ASSETS_DIR,
  "restored-assets/",
] as const;

/**
 * Resolve where an asset from the ZIP should be written on this device.
 * Uses zipPath (stable across devices) instead of originalUri from the export device.
 */
export function resolveAssetDestUri(originalUri: string, zipPath: string): string | null {
  const base = FileSystem.documentDirectory;
  if (!base) return null;

  const normalizedZip = zipPath.replace(/^\/+/, "");
  if (normalizedZip.length > 0 && !normalizedZip.includes("..")) {
    return `${base}${normalizedZip}`;
  }

  for (const prefix of KNOWN_DOC_SUBDIRS) {
    const idx = originalUri.lastIndexOf(prefix);
    if (idx >= 0) {
      const suffix = originalUri.slice(idx);
      if (!suffix.includes("..")) return `${base}${suffix}`;
    }
  }

  const fileName = originalUri.split("/").pop()?.split("?")[0];
  if (fileName && !fileName.includes("..")) {
    return `${base}restored-assets/${fileName}`;
  }

  return null;
}
