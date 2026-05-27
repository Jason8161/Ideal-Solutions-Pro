import { Platform } from "react-native";

export type LauncherAppInfo = {
  packageName: string;
  appName: string;
};

type NativeModule = {
  getLauncherApps: () => Promise<LauncherAppInfo[]>;
  isPackageInstalled: (packageName: string) => Promise<boolean>;
  launchPackage: (packageName: string) => Promise<void>;
};

let native: NativeModule | null = null;

if (Platform.OS === "android") {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { requireNativeModule } = require("expo-modules-core") as typeof import("expo-modules-core");
    native = requireNativeModule<NativeModule>("InstalledLauncherApps");
  } catch {
    native = null;
  }
}

export function isLauncherAppDiscoverySupported(): boolean {
  return Platform.OS === "android" && native != null;
}

/** Android-only: launcher apps on device. Never call on iOS. */
export async function getLauncherAppsOnDevice(): Promise<LauncherAppInfo[]> {
  if (!native) return [];
  try {
    return await native.getLauncherApps();
  } catch {
    return [];
  }
}

/** True when a known package has a launcher activity (Android 11+ queries manifest). */
export async function isAndroidPackageInstalled(packageName: string): Promise<boolean> {
  if (!native || !packageName?.trim()) return false;
  try {
    return await native.isPackageInstalled(packageName.trim());
  } catch {
    return false;
  }
}

export async function launchAndroidPackage(packageName: string): Promise<void> {
  if (!native) {
    throw new Error("Opening installed apps by package is only supported on Android.");
  }
  await native.launchPackage(packageName);
}
