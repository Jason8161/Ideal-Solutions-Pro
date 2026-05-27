import AsyncStorage from "@react-native-async-storage/async-storage";
import * as FileSystem from "expo-file-system/legacy";

import { ASSET_URI_PREFIX, BACKUP_APP_ID, BACKUP_FORMAT_VERSION } from "./constants";
import { getCurrentAppVersion } from "./appVersionStorage";
import type { BackupAssetEntry, BackupBundle, BackupDataDomain } from "./types";

const PROFILE_STORAGE_KEY = "ideal_solutions_company_profile_v1";

const KNOWN_IMAGE_DIRS = [
  "button-images/",
  "home-tile-overrides/",
  "company-logos/",
] as const;

export function isAppBackupKey(key: string): boolean {
  return key.startsWith("ideal_solutions_") || key === "distributorPortalUrl";
}

function inferDomains(keys: string[]): BackupDataDomain[] {
  const domains = new Set<BackupDataDomain>();
  for (const key of keys) {
    if (key === PROFILE_STORAGE_KEY) domains.add("profile");
    else if (key.includes("boss_jobs")) domains.add("bossJobs");
    else if (key.includes("estimate") || key.includes("service_calls")) {
      domains.add("estimates");
      if (key.includes("service_calls")) domains.add("serviceCalls");
    } else if (key.includes("employees") || key.includes("crew")) {
      domains.add("employees");
    } else if (key.includes("invoice")) domains.add("invoices");
    else if (key.includes("appointment") || key.includes("schedule")) domains.add("calendar");
    else if (key.includes("ai_assistance")) domains.add("aiProjects");
    else if (key.includes("material_list")) domains.add("materialLists");
    else if (
      key.includes("color_scheme") ||
      key.includes("display") ||
      key.includes("preferences") ||
      key.includes("payment_apps") ||
      key.includes("misc_app") ||
      key.includes("supplier") ||
      key.includes("subscription") ||
      key.includes("legal")
    ) {
      domains.add("settings");
    }
  }
  return [...domains].sort();
}

function fileUriPattern(): RegExp | null {
  const base = FileSystem.documentDirectory;
  if (!base) return null;
  const escaped = base.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return new RegExp(`${escaped}[A-Za-z0-9_./\\-%]+`, "g");
}

function extensionFromUri(uri: string): string {
  const match = /\.([a-zA-Z0-9]+)(?:\?|$)/.exec(uri);
  const ext = match?.[1]?.toLowerCase();
  if (ext && /^(png|jpe?g|webp|heic|heif|gif|bmp|pdf)$/i.test(ext)) return `.${ext}`;
  return ".bin";
}

function collectUrisFromString(value: string, docPattern: RegExp | null, found: Set<string>): void {
  if (!docPattern) return;
  const matches = value.match(docPattern);
  if (!matches) return;
  for (const uri of matches) {
    if (uri.startsWith("file:") || uri.includes(FileSystem.documentDirectory ?? "")) {
      found.add(uri);
    }
  }
}

async function collectKnownDirectoryFiles(found: Set<string>): Promise<void> {
  const base = FileSystem.documentDirectory;
  if (!base) return;
  for (const sub of KNOWN_IMAGE_DIRS) {
    const dir = `${base}${sub}`;
    const info = await FileSystem.getInfoAsync(dir);
    if (!info.exists || !info.isDirectory) continue;
    let names: string[] = [];
    try {
      names = await FileSystem.readDirectoryAsync(dir);
    } catch {
      continue;
    }
    for (const name of names) {
      found.add(`${dir}${name}`);
    }
  }
}

async function buildAssetEntries(fileUris: string[]): Promise<BackupAssetEntry[]> {
  const assets: BackupAssetEntry[] = [];
  let index = 0;
  for (const originalUri of fileUris) {
    const info = await FileSystem.getInfoAsync(originalUri);
    if (!info.exists) continue;
    index += 1;
    const ext = extensionFromUri(originalUri);
    assets.push({
      zipPath: `assets/file-${String(index).padStart(4, "0")}${ext}`,
      originalUri,
      sizeBytes: info.size,
    });
  }
  return assets;
}

function replaceUrisInEntries(
  entries: Record<string, string>,
  uriToZipPath: Map<string, string>,
): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [key, value] of Object.entries(entries)) {
    let next = value;
    for (const [uri, zipPath] of uriToZipPath) {
      if (next.includes(uri)) {
        next = next.split(uri).join(`${ASSET_URI_PREFIX}${zipPath}`);
      }
    }
    out[key] = next;
  }
  return out;
}

export async function collectAllAppData(): Promise<BackupBundle> {
  let keys: string[] = [];
  try {
    keys = (await AsyncStorage.getAllKeys()).filter(isAppBackupKey);
  } catch {
    keys = [];
  }

  const entries: Record<string, string> = {};
  if (keys.length > 0) {
    try {
      const pairs = await AsyncStorage.multiGet(keys);
      for (const [k, v] of pairs) {
        if (v != null) entries[k] = v;
      }
    } catch {
      /* continue with partial keys */
    }
  }

  const docPattern = fileUriPattern();
  const uriSet = new Set<string>();
  for (const value of Object.values(entries)) {
    collectUrisFromString(value, docPattern, uriSet);
  }
  try {
    await collectKnownDirectoryFiles(uriSet);
  } catch {
    /* directory scan optional */
  }

  const sortedUris = [...uriSet].sort();
  let assets: BackupAssetEntry[] = [];
  try {
    assets = await buildAssetEntries(sortedUris);
  } catch {
    assets = [];
  }
  const uriToZipPath = new Map(assets.map((a) => [a.originalUri, a.zipPath]));
  const remappedEntries = replaceUrisInEntries(entries, uriToZipPath);

  const domains = inferDomains(keys);
  if (assets.length > 0) domains.push("images");

  return {
    formatVersion: BACKUP_FORMAT_VERSION,
    appId: BACKUP_APP_ID,
    exportedAt: new Date().toISOString(),
    appVersion: getCurrentAppVersion(),
    entries: remappedEntries,
    assets,
    includedDomains: [...new Set(domains)].sort(),
  };
}

export async function hasSignificantAppData(): Promise<boolean> {
  const keys = (await AsyncStorage.getAllKeys()).filter(isAppBackupKey);
  if (keys.length === 0) return false;
  const profileRaw = await AsyncStorage.getItem(PROFILE_STORAGE_KEY);
  if (!profileRaw) return keys.length > 2;
  try {
    const profile = JSON.parse(profileRaw) as { profileCompleted?: boolean; companyName?: string };
    if (profile.profileCompleted) return true;
    if ((profile.companyName ?? "").trim().length > 0) return true;
  } catch {
    /* ignore */
  }
  return keys.length > 3;
}
