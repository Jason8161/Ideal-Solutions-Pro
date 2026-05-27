import AsyncStorage from "@react-native-async-storage/async-storage";

const STORAGE_KEY = "ideal_solutions_misc_custom_apps_v1";

export const CUSTOM_MISC_APP_PREFIX = "custom:" as const;

export type CustomMiscApp = {
  id: string;
  name: string;
  androidPackage?: string;
  iosUrlScheme?: string;
  nativeUrls: string[];
  addedAt: number;
};

function parseRows(raw: unknown): CustomMiscApp[] {
  if (!Array.isArray(raw)) return [];
  const out: CustomMiscApp[] = [];
  for (const row of raw) {
    if (!row || typeof row !== "object") continue;
    const id = (row as { id?: unknown }).id;
    const name = (row as { name?: unknown }).name;
    if (typeof id !== "string" || typeof name !== "string") continue;
    const androidPackage = (row as { androidPackage?: unknown }).androidPackage;
    const iosUrlScheme = (row as { iosUrlScheme?: unknown }).iosUrlScheme;
    const nativeUrls = (row as { nativeUrls?: unknown }).nativeUrls;
    const addedAt = (row as { addedAt?: unknown }).addedAt;
    out.push({
      id,
      name: name.trim(),
      androidPackage: typeof androidPackage === "string" ? androidPackage : undefined,
      iosUrlScheme: typeof iosUrlScheme === "string" ? iosUrlScheme.trim() : undefined,
      nativeUrls: Array.isArray(nativeUrls)
        ? nativeUrls.filter((u): u is string => typeof u === "string")
        : buildNativeUrls(
            typeof androidPackage === "string" ? androidPackage : undefined,
            typeof iosUrlScheme === "string" ? iosUrlScheme : undefined,
          ),
      addedAt: typeof addedAt === "number" ? addedAt : Date.now(),
    });
  }
  return out.filter((a) => a.name.length > 0);
}

export function buildNativeUrls(androidPackage?: string, iosScheme?: string): string[] {
  const urls: string[] = [];
  if (iosScheme) {
    const scheme = iosScheme.replace(/:\/\//g, "").replace(/:$/g, "");
    if (scheme) urls.push(`${scheme}://`);
  }
  if (androidPackage) {
    urls.push(`android-app://${androidPackage}`);
  }
  return urls;
}

export function customMiscShortcutId(id: string): string {
  return `${CUSTOM_MISC_APP_PREFIX}${id}`;
}

export function parseCustomMiscShortcutId(shortcutId: string): string | null {
  if (!shortcutId.startsWith(CUSTOM_MISC_APP_PREFIX)) return null;
  return shortcutId.slice(CUSTOM_MISC_APP_PREFIX.length);
}

export function newCustomMiscAppId(): string {
  return `${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

export async function loadCustomMiscApps(): Promise<CustomMiscApp[]> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    return parseRows(JSON.parse(raw) as unknown);
  } catch {
    return [];
  }
}

export async function saveCustomMiscApps(apps: CustomMiscApp[]): Promise<void> {
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(apps));
}

export async function addCustomMiscAppFromAndroid(
  appName: string,
  packageName: string,
): Promise<CustomMiscApp> {
  const apps = await loadCustomMiscApps();
  const existing = apps.find((a) => a.androidPackage === packageName);
  if (existing) return existing;

  const created: CustomMiscApp = {
    id: newCustomMiscAppId(),
    name: appName.trim() || packageName,
    androidPackage: packageName,
    nativeUrls: buildNativeUrls(packageName, undefined),
    addedAt: Date.now(),
  };
  await saveCustomMiscApps([...apps, created]);
  return created;
}

export async function addCustomMiscAppManual(fields: {
  name: string;
  iosUrlScheme?: string;
}): Promise<CustomMiscApp> {
  const name = fields.name.trim();
  const scheme = fields.iosUrlScheme?.trim();
  const apps = await loadCustomMiscApps();
  const created: CustomMiscApp = {
    id: newCustomMiscAppId(),
    name,
    iosUrlScheme: scheme || undefined,
    nativeUrls: buildNativeUrls(undefined, scheme),
    addedAt: Date.now(),
  };
  await saveCustomMiscApps([...apps, created]);
  return created;
}

export async function deleteCustomMiscApp(id: string): Promise<void> {
  const apps = await loadCustomMiscApps();
  await saveCustomMiscApps(apps.filter((a) => a.id !== id));
}
