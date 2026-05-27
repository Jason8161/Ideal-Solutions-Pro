import { Alert, Platform } from "react-native";

import {
  isAndroidPackageInstalled,
  isLauncherAppDiscoverySupported,
  launchAndroidPackage,
} from "@/lib/installedPhoneApps";
import {
  safeCanOpenAny,
  safeCanOpenURL,
  safeOpenFirstAvailable,
} from "@/lib/linkingSafe";
import {
  clearMaterialVendorAppAssignment,
  loadMaterialVendorAppAssignment,
  saveMaterialVendorAppAssignment,
} from "@/lib/materialVendorAppAssignments";
import {
  getMaterialVendorLaunchConfig,
  nativeLaunchUrlsForVendor,
  type MaterialVendorLaunchConfig,
} from "@/lib/materialVendorLaunchConfig";

type OpenUrlOptions = {
  /** Android only: try openURL when canOpenURL is false for custom schemes. */
  aggressive?: boolean;
};

type AndroidPackageCandidate = {
  packageName: string;
  appName: string;
};

async function openFirstAvailable(
  urls: readonly string[],
  opts?: OpenUrlOptions,
): Promise<boolean> {
  return safeOpenFirstAvailable(urls, {
    allowAggressiveCustomScheme: Platform.OS === "android" && opts?.aggressive === true,
  });
}

/** Known package IDs only — never enumerates all launcher apps on the device. */
async function findKnownAndroidPackages(
  config: MaterialVendorLaunchConfig,
): Promise<AndroidPackageCandidate[]> {
  if (Platform.OS !== "android") return [];
  const matched: AndroidPackageCandidate[] = [];
  for (const packageName of config.androidPackages) {
    if (!packageName?.trim()) continue;
    if (await isAndroidPackageInstalled(packageName)) {
      matched.push({ packageName, appName: config.displayName });
    }
  }
  return matched;
}

async function tryLaunchAndroidPackage(packageName: string): Promise<boolean> {
  if (!packageName?.trim()) return false;
  try {
    await launchAndroidPackage(packageName);
    return true;
  } catch {
    return false;
  }
}

async function openAssignedAndroid(
  config: MaterialVendorLaunchConfig,
  packageName: string,
  query?: string,
  opts?: OpenUrlOptions,
): Promise<boolean> {
  if (await tryLaunchAndroidPackage(packageName)) return true;

  const urls = nativeLaunchUrlsForVendor(config.vendorKey, query);
  if (urls.length > 0) {
    return openFirstAvailable(urls, opts);
  }
  return false;
}

export function hasMaterialVendorNativeApp(vendorKey: string): boolean {
  const config = getMaterialVendorLaunchConfig(vendorKey);
  return config != null && (config.nativeUrls.length > 0 || config.androidPackages.length > 0);
}

export async function isMaterialVendorNativeAvailable(vendorKey: string): Promise<boolean> {
  if (!vendorKey || typeof vendorKey !== "string") return false;
  const config = getMaterialVendorLaunchConfig(vendorKey);
  if (!config) return false;

  if (Platform.OS === "android") {
    const assignment = await loadMaterialVendorAppAssignment(vendorKey);
    const matches = await findKnownAndroidPackages(config);
    if (assignment?.androidPackage && matches.some((a) => a.packageName === assignment.androidPackage)) {
      return true;
    }
    if (matches.length > 0) return true;
  }

  if (config.nativeUrls.length > 0) {
    return safeCanOpenAny(config.nativeUrls);
  }

  return false;
}

function promptPickVendorApp(
  config: MaterialVendorLaunchConfig,
  candidates: AndroidPackageCandidate[],
  query?: string,
): Promise<boolean> {
  return new Promise((resolve) => {
    const buttons = [
      ...candidates.slice(0, 5).map((app) => ({
        text: app.appName,
        onPress: () => {
          void (async () => {
            await saveMaterialVendorAppAssignment(config.vendorKey, {
              androidPackage: app.packageName,
            });
            const opened = await openAssignedAndroid(config, app.packageName, query, { aggressive: true });
            resolve(opened);
          })();
        },
      })),
      {
        text: "Clear saved app",
        style: "destructive" as const,
        onPress: () => {
          void clearMaterialVendorAppAssignment(config.vendorKey).then(() => resolve(false));
        },
      },
      { text: "Cancel", style: "cancel" as const, onPress: () => resolve(false) },
    ];
    Alert.alert(
      `Open ${config.displayName}`,
      candidates.length > 1
        ? "Multiple matching apps are installed. Choose which one to use for this supplier."
        : "Choose the app to open for this supplier.",
      buttons,
    );
  });
}

/**
 * Opens the vendor native app when possible (may include search deep links).
 * Supplier Hub uses {@link tryLaunchSupplierHomepage} in lib/supplierHub/supplierLaunch.ts for homepage-only launch.
 */
export async function tryOpenMaterialVendorNativeApp(
  vendorKey: string,
  query?: string,
  opts?: { forcePick?: boolean; aggressive?: boolean },
): Promise<boolean> {
  if (!vendorKey || typeof vendorKey !== "string") return false;
  const config = getMaterialVendorLaunchConfig(vendorKey);
  if (!config) return false;

  const openOpts: OpenUrlOptions = {
    aggressive: Platform.OS === "android" && opts?.aggressive === true,
  };
  const assignment = await loadMaterialVendorAppAssignment(vendorKey);

  if (Platform.OS === "android") {
    const matches = await findKnownAndroidPackages(config);

    if (assignment?.androidPackage) {
      const saved = matches.find((m) => m.packageName === assignment.androidPackage);
      if (saved) {
        return openAssignedAndroid(config, saved.packageName, query, { aggressive: true });
      }
    }

    if (matches.length === 1 && !opts?.forcePick) {
      await saveMaterialVendorAppAssignment(config.vendorKey, {
        androidPackage: matches[0].packageName,
      });
      return openAssignedAndroid(config, matches[0].packageName, query, { aggressive: true });
    }
    if (matches.length > 0 && (opts?.forcePick || matches.length > 1)) {
      return promptPickVendorApp(config, matches, query);
    }

    for (const pkg of config.androidPackages) {
      if (!(await isAndroidPackageInstalled(pkg))) continue;
      await saveMaterialVendorAppAssignment(config.vendorKey, { androidPackage: pkg });
      if (await tryLaunchAndroidPackage(pkg)) return true;
    }
  }

  const urls = nativeLaunchUrlsForVendor(vendorKey, query);
  if (urls.length > 0) {
    return openFirstAvailable(urls, openOpts);
  }

  return false;
}

/** Long-press: pick among known installed packages or clear assignment (Android only). */
export async function promptAssignMaterialVendorApp(vendorKey: string): Promise<void> {
  const config = getMaterialVendorLaunchConfig(vendorKey);
  if (!config) {
    Alert.alert("Website only", "No native app mapping for this supplier.");
    return;
  }

  if (Platform.OS === "android" && isLauncherAppDiscoverySupported()) {
    const matches = await findKnownAndroidPackages(config);
    if (matches.length > 0) {
      await promptPickVendorApp(config, matches);
      return;
    }
  }

  const hasScheme = config.nativeUrls.length > 0;
  if (hasScheme) {
    if (await safeCanOpenAny(config.nativeUrls)) {
      Alert.alert(config.displayName, "The store app is available on this device.");
      return;
    }
  }

  Alert.alert(
    `${config.displayName} app not found`,
    Platform.OS === "ios"
      ? "Install the store app from the App Store, or continue using the website when you tap this supplier."
      : "Install the store app from Play Store, or continue using the website when you tap this supplier.",
  );
}
