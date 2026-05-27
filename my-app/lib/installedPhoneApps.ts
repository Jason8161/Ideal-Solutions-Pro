/**
 * Android-only helpers for known package launch checks.
 * iOS must never call getLauncherAppsOnDevice — use static integrations + canOpenURL instead.
 */
import { Platform } from "react-native";

import type { LauncherAppInfo } from "installed-launcher-apps";
import {
  getLauncherAppsOnDevice as nativeGetLauncherAppsOnDevice,
  isAndroidPackageInstalled,
  isLauncherAppDiscoverySupported,
  launchAndroidPackage,
} from "installed-launcher-apps";

export type { LauncherAppInfo } from "installed-launcher-apps";

export { isAndroidPackageInstalled, isLauncherAppDiscoverySupported, launchAndroidPackage };

/** Android-only launcher list. iOS always returns []. */
export async function getLauncherAppsOnDevice(): Promise<LauncherAppInfo[]> {
  if (Platform.OS !== "android") return [];
  return nativeGetLauncherAppsOnDevice();
}
