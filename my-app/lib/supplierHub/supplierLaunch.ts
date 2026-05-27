import { Platform } from "react-native";

import { isMaterialNativeAppSupplier } from "@/lib/materialNativeAppSuppliers";
import {
  isAndroidPackageInstalled,
  launchAndroidPackage,
} from "@/lib/installedPhoneApps";
import {
  isValidLinkUrl,
  safeCanOpenURL,
  safeOpenFirstAvailable,
} from "@/lib/linkingSafe";
import {
  isSupplierAppConfirmed,
  recordSupplierAppConfirmed,
} from "@/lib/supplierHub/confirmedAppOpenStorage";
import {
  getSupplierHubConfig,
  supplierHubHasNativeApp,
  type SupplierHubConfig,
} from "@/lib/supplierHub/supplierConfig";

function devLog(message: string, extra?: unknown): void {
  if (!__DEV__) return;
  if (extra !== undefined) {
    console.log(`[SupplierHub] ${message}`, extra);
  } else {
    console.log(`[SupplierHub] ${message}`);
  }
}

/** Homepage-only custom scheme URL (no product/search deep links). */
export function homepageAppUrl(iosScheme: string): string {
  const scheme = iosScheme.trim().toLowerCase();
  return `${scheme}://`;
}

function schemeUrlsForConfig(config: SupplierHubConfig): string[] {
  if (!config.supportsNativeApp || !isMaterialNativeAppSupplier(config.id)) return [];
  const scheme = config.iosScheme?.trim();
  if (!scheme) return [];
  const primary = homepageAppUrl(scheme);
  const urls = [primary];
  if (scheme === "homedepot") {
    urls.push("com.thehomedepot.homedepot://");
  }
  return urls.filter(isValidLinkUrl);
}

/**
 * iOS: Linking.canOpenURL on declared scheme URLs only (Home Depot, Lowe's).
 * Android: targeted package launcher check, then scheme canOpenURL.
 */
export async function checkIfAppInstalled(supplierId: string): Promise<boolean> {
  if (!isMaterialNativeAppSupplier(supplierId)) return false;
  const config = getSupplierHubConfig(supplierId);
  if (!config || !supplierHubHasNativeApp(config)) return false;

  if (await isSupplierAppConfirmed(supplierId)) return true;

  if (Platform.OS === "android" && config.androidPackage?.trim()) {
    const installed = await isAndroidPackageInstalled(config.androidPackage);
    if (installed) return true;
  }

  for (const url of schemeUrlsForConfig(config)) {
    if (await safeCanOpenURL(url)) return true;
  }

  return false;
}

/** Probes native install state for Home Depot and Lowe's only. */
export async function detectHubInstalledMap(
  supplierIds: readonly string[],
): Promise<Record<string, boolean>> {
  const nativeIds = supplierIds.filter((id) => isMaterialNativeAppSupplier(id));
  if (!nativeIds.length) return {};
  try {
    const entries = await Promise.all(
      nativeIds.map(async (id) => {
        try {
          return [id, await checkIfAppInstalled(id)] as const;
        } catch {
          return [id, false] as const;
        }
      }),
    );
    return Object.fromEntries(entries);
  } catch {
    return {};
  }
}

async function tryOpenSchemeHomepage(config: SupplierHubConfig): Promise<boolean> {
  const urls = schemeUrlsForConfig(config);
  if (!urls.length) return false;

  const opened = await safeOpenFirstAvailable(urls, {
    allowAggressiveCustomScheme: Boolean(config.iosScheme?.trim()),
  });
  if (!opened) {
    devLog("scheme launch failed", { id: config.id, urls });
  }
  return opened;
}

/** Opens supplier native app at homepage only. Returns true when a launch was attempted successfully. */
export async function tryLaunchSupplierHomepage(config: SupplierHubConfig): Promise<boolean> {
  if (!supplierHubHasNativeApp(config)) {
    devLog("no native mapping", { id: config.id });
    return false;
  }

  if (Platform.OS === "android" && config.androidPackage?.trim()) {
    try {
      const installed = await isAndroidPackageInstalled(config.androidPackage);
      if (installed) {
        await launchAndroidPackage(config.androidPackage);
        await recordSupplierAppConfirmed(config.id);
        return true;
      }
      devLog("android package not installed", {
        id: config.id,
        package: config.androidPackage,
      });
    } catch (e) {
      devLog("android package launch failed", {
        id: config.id,
        package: config.androidPackage,
        error: e instanceof Error ? e.message : String(e),
      });
    }
  }

  const schemeOpened = await tryOpenSchemeHomepage(config);
  if (schemeOpened) {
    await recordSupplierAppConfirmed(config.id);
  }
  if (!schemeOpened) {
    const urls = schemeUrlsForConfig(config);
    if (urls.length === 0) {
      devLog("invalid or missing scheme", { id: config.id, scheme: config.iosScheme });
    } else {
      devLog("scheme launch failed", { id: config.id, urls });
    }
  }
  return schemeOpened;
}
