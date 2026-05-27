import AsyncStorage from "@react-native-async-storage/async-storage";
import * as FileSystem from "expo-file-system/legacy";

import { HOME_TILES_WITH_CUSTOM_IMAGES, type HomeTileImageKey } from "@/lib/homeMenuItems";

const MAP_KEY = "ideal_solutions_home_tile_overrides_v1";
const TEXT_ONLY_RESET_KEY = "ideal_solutions_home_tile_text_only_reset_v1";

export type HomeTileImageOverrides = Partial<Record<HomeTileImageKey, string>>;

function extensionFromUri(uri: string): string {
  const match = /\.([a-zA-Z0-9]+)(?:\?|$)/.exec(uri);
  const ext = match?.[1]?.toLowerCase();
  if (ext && /^(png|jpe?g|webp|heic|heif|gif|bmp)$/i.test(ext)) return `.${ext}`;
  return ".jpg";
}

function overridesDir(): string | null {
  const base = FileSystem.documentDirectory;
  if (!base) return null;
  return `${base}home-tile-overrides/`;
}

async function ensureOverridesDir(): Promise<string> {
  const dir = overridesDir();
  if (!dir) throw new Error("File storage is not available on this device.");
  const info = await FileSystem.getInfoAsync(dir);
  if (!info.exists) {
    await FileSystem.makeDirectoryAsync(dir, { intermediates: true });
  }
  return dir;
}

function isKnownKey(key: string): key is HomeTileImageKey {
  return HOME_TILES_WITH_CUSTOM_IMAGES.some((item) => item.key === key);
}

async function readMap(): Promise<HomeTileImageOverrides> {
  try {
    const raw = await AsyncStorage.getItem(MAP_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as unknown;
    if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) return {};
    const out: HomeTileImageOverrides = {};
    for (const [k, v] of Object.entries(parsed)) {
      if (!isKnownKey(k)) continue;
      if (typeof v === "string" && v.length > 0) out[k] = v;
    }
    return out;
  } catch {
    return {};
  }
}

async function writeMap(map: HomeTileImageOverrides): Promise<void> {
  await AsyncStorage.setItem(MAP_KEY, JSON.stringify(map));
}

/** Returns override file URIs that still exist on disk. Stale entries are removed from storage. */
export async function loadHomeTileImageOverrides(): Promise<HomeTileImageOverrides> {
  const map = await readMap();
  const next: HomeTileImageOverrides = { ...map };
  let changed = false;
  for (const key of Object.keys(next) as HomeTileImageKey[]) {
    const uri = next[key];
    if (!uri) continue;
    const info = await FileSystem.getInfoAsync(uri);
    if (!info.exists) {
      delete next[key];
      changed = true;
    }
  }
  if (changed) await writeMap(next);
  return next;
}

export async function setHomeTileImageOverride(key: HomeTileImageKey, sourceUri: string): Promise<string> {
  const dir = await ensureOverridesDir();
  const ext = extensionFromUri(sourceUri);
  const destUri = `${dir}${key}${ext}`;

  const prev = await readMap();
  const oldUri = prev[key];
  if (oldUri && oldUri !== destUri) {
    const oldInfo = await FileSystem.getInfoAsync(oldUri);
    if (oldInfo.exists) {
      await FileSystem.deleteAsync(oldUri, { idempotent: true });
    }
  }

  await FileSystem.copyAsync({ from: sourceUri, to: destUri });

  await writeMap({ ...prev, [key]: destUri });
  return destUri;
}

export async function clearHomeTileImageOverride(key: HomeTileImageKey): Promise<void> {
  const prev = await readMap();
  const uri = prev[key];
  if (uri) {
    const info = await FileSystem.getInfoAsync(uri);
    if (info.exists) {
      await FileSystem.deleteAsync(uri, { idempotent: true });
    }
  }
  const { [key]: _, ...rest } = prev;
  await writeMap(rest);
}

/** One-time wipe of saved overrides when switching home tiles back to icon + label only. */
export async function ensureHomeTilesTextOnlyReset(): Promise<void> {
  try {
    const done = await AsyncStorage.getItem(TEXT_ONLY_RESET_KEY);
    if (done) return;
    await clearAllHomeTileImageOverrides();
    await AsyncStorage.setItem(TEXT_ONLY_RESET_KEY, "1");
  } catch {
    /* ignore */
  }
}

/** Removes every saved home-tile image override and deletes copied files on disk. */
export async function clearAllHomeTileImageOverrides(): Promise<void> {
  const prev = await readMap();
  for (const key of Object.keys(prev) as HomeTileImageKey[]) {
    const uri = prev[key];
    if (!uri) continue;
    const info = await FileSystem.getInfoAsync(uri);
    if (info.exists) {
      await FileSystem.deleteAsync(uri, { idempotent: true });
    }
  }
  await writeMap({});
}
