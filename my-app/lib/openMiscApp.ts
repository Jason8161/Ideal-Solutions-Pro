import { Alert, Linking, Platform } from "react-native";

import { launchAndroidPackage } from "installed-launcher-apps";
import { assignMiscAppQuickLink } from "@/lib/miscAppQuickLinks";
import { loadSelectedMiscAppIds } from "@/lib/miscAppPreferences";
import {
  miscAppById,
  storeUrlForMiscApp,
  type MiscAppDefinition,
  type MiscAppId,
} from "@/lib/miscAppsCatalog";
import { resolveMiscShortcuts, type ResolvedMiscShortcut } from "@/lib/miscShortcuts";

async function openFirstAvailable(urls: readonly string[]): Promise<boolean> {
  for (const url of urls) {
    try {
      const ok = await Linking.canOpenURL(url).catch(() => false);
      if (ok) {
        await Linking.openURL(url);
        return true;
      }
    } catch {
      /* try next */
    }
  }
  return false;
}

export async function isMiscAppInstalled(def: MiscAppDefinition): Promise<boolean> {
  if (def.nativeUrls.length === 0) return false;
  for (const url of def.nativeUrls) {
    const ok = await Linking.canOpenURL(url).catch(() => false);
    if (ok) return true;
  }
  return false;
}

export async function isCustomMiscAppInstalled(custom: ResolvedMiscShortcut & { kind: "custom" }): Promise<boolean> {
  if (custom.custom.androidPackage && Platform.OS === "android") {
    return true;
  }
  if (custom.custom.nativeUrls.length === 0) return false;
  for (const url of custom.custom.nativeUrls) {
    if (url.startsWith("android-app://")) continue;
    const ok = await Linking.canOpenURL(url).catch(() => false);
    if (ok) return true;
  }
  return false;
}

function promptNotInstalled(def: MiscAppDefinition): void {
  const store = storeUrlForMiscApp(def);
  Alert.alert(
    `${def.name} app not detected`,
    Platform.OS === "ios"
      ? "Ideal Solutions Pro can only check apps from a curated list (iOS does not allow scanning all installed apps). Open the website or install the app from your store."
      : "Open the website or install the app from your store.",
    [
      { text: "Cancel", style: "cancel" },
      { text: "Open website", onPress: () => void Linking.openURL(def.webUrl) },
      {
        text: "Get app",
        onPress: () => {
          void assignMiscAppQuickLink(def.id);
          void Linking.openURL(store);
        },
      },
    ],
  );
}

async function openCustomMiscShortcut(custom: ResolvedMiscShortcut & { kind: "custom" }): Promise<void> {
  if (Platform.OS === "android" && custom.custom.androidPackage) {
    try {
      await launchAndroidPackage(custom.custom.androidPackage);
      return;
    } catch (e) {
      Alert.alert(
        `Could not open ${custom.custom.name}`,
        e instanceof Error ? e.message : "Try again.",
      );
      return;
    }
  }

  const opened = await openFirstAvailable(custom.custom.nativeUrls);
  if (opened) return;

  Alert.alert(
    custom.custom.name,
    Platform.OS === "ios"
      ? "Add a URL scheme for this app under Settings → Misc Apps, or reinstall the app and try again."
      : "This shortcut could not be opened.",
  );
}

async function openCatalogMiscApp(def: MiscAppDefinition): Promise<void> {
  if (def.nativeUrls.length === 0) {
    await Linking.openURL(def.webUrl);
    return;
  }

  const opened = await openFirstAvailable(def.nativeUrls);
  if (opened) return;

  promptNotInstalled(def);
}

/** Opens any misc shortcut (catalog or custom from the user's phone). */
export async function openMiscShortcut(shortcutId: string): Promise<void> {
  const selected = await loadSelectedMiscAppIds();
  if (!selected.includes(shortcutId)) {
    Alert.alert("Not on your list", "Add this app under Settings → Misc Apps.");
    return;
  }

  const resolved = await resolveMiscShortcuts([shortcutId]);
  const entry = resolved[0];
  if (!entry) {
    Alert.alert("Not found", "This shortcut is no longer available.");
    return;
  }

  if (entry.kind === "custom") {
    await openCustomMiscShortcut(entry);
    return;
  }

  await openCatalogMiscApp(entry.def);
}

/** Opens a misc app shortcut: native app when installed, otherwise website / store prompt. */
export async function openMiscApp(appId: MiscAppId): Promise<void> {
  await openMiscShortcut(appId);
}
