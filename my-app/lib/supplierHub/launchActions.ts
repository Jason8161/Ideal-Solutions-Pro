import { Alert, Platform } from "react-native";

import { safeOpenURL } from "@/lib/linkingSafe";
import { LOWES_WEBSITE_URL, lowesStoreUrlForPlatform } from "@/lib/retailUrls";
import {
  getSupplierHubConfig,
  getSupplierHubEntry,
  storeUrlForHubSupplier,
  supplierHubHasNativeApp,
  type SupplierHubConfig,
  type SupplierHubEntry,
} from "@/lib/supplierHub/supplierConfig";
import {
  isSupplierAppConfirmed,
  recordSupplierAppConfirmed,
} from "@/lib/supplierHub/confirmedAppOpenStorage";
import {
  checkIfAppInstalled,
  detectHubInstalledMap,
  tryLaunchSupplierHomepage,
} from "@/lib/supplierHub/supplierLaunch";
import { recordRecentSupplier } from "@/lib/supplierHub/recentSuppliersStorage";

export { checkIfAppInstalled, detectHubInstalledMap };

/** Whether Supplier Hub should offer Open/Install App actions for this supplier. */
export function supplierHubSupportsNativeApp(entry: SupplierHubEntry | SupplierHubConfig): boolean {
  return supplierHubHasNativeApp(entry);
}

/** Lowe's app is US-only in the stores — offer website when install is unavailable. */
export async function promptLowesAppStoreInstall(): Promise<boolean> {
  const storeUrl = lowesStoreUrlForPlatform();
  const storeLabel = Platform.OS === "ios" ? "App Store" : "Play Store";
  return new Promise((resolve) => {
    Alert.alert(
      "Lowe's mobile app",
      `The Lowe's app is published for the United States ${storeLabel}. If you see "not available in your country or region," use Open website — lowes.com works in your browser from most locations.`,
      [
        { text: "Cancel", style: "cancel", onPress: () => resolve(false) },
        {
          text: "Open website",
          onPress: () => {
            void safeOpenURL(LOWES_WEBSITE_URL).then(resolve);
          },
        },
        {
          text: `Open ${storeLabel}`,
          onPress: () => {
            void safeOpenURL(storeUrl).then(resolve);
          },
        },
      ],
    );
  });
}

/** Open App Store / Play Store listing for the supplier app. */
export async function installSupplierApp(supplierId: string): Promise<boolean> {
  if (supplierId === "lowes") {
    return promptLowesAppStoreInstall();
  }
  const config = getSupplierHubConfig(supplierId);
  const storeUrl = config ? storeUrlForHubSupplier(config) : undefined;
  if (!storeUrl) {
    Alert.alert("No app listing", "This supplier does not have a known app store link.");
    return false;
  }
  return safeOpenURL(storeUrl);
}

async function openWebsiteWithAlert(config: SupplierHubConfig): Promise<void> {
  const opened = await safeOpenURL(config.websiteUrl);
  if (opened) {
    await recordRecentSupplier(config.id);
    return;
  }
  Alert.alert("Could not open", "This website link is not available.");
}

/** Open supplier homepage in the device browser. */
export async function openSupplierWebsite(supplierId: string): Promise<void> {
  const config = getSupplierHubConfig(supplierId);
  if (!config) {
    Alert.alert("Not found", "This supplier does not have a website link.");
    return;
  }
  await openWebsiteWithAlert(config);
}

/** Open supplier native app homepage; remembers successful opens for later visits. */
export async function openSupplierApp(supplierId: string): Promise<boolean> {
  const config = getSupplierHubConfig(supplierId);
  if (!config) return false;

  if (!supplierHubHasNativeApp(config)) {
    await openWebsiteWithAlert(config);
    return true;
  }

  const previouslyConfirmed = await isSupplierAppConfirmed(supplierId);
  const opened = await tryLaunchSupplierHomepage(config);
  if (opened) {
    await recordSupplierAppConfirmed(supplierId);
    await recordRecentSupplier(supplierId);
    return true;
  }

  if (previouslyConfirmed) {
    return new Promise((resolve) => {
      Alert.alert(
        "Could not open app",
        "The supplier app did not open. Try again or use the website.",
        [
          { text: "Cancel", style: "cancel", onPress: () => resolve(false) },
          {
            text: "Open Website",
            onPress: () => {
              void openWebsiteWithAlert(config).then(() => resolve(true));
            },
          },
          {
            text: "Try Again",
            onPress: () => {
              void (async () => {
                const retry = await tryLaunchSupplierHomepage(config);
                if (retry) {
                  await recordSupplierAppConfirmed(supplierId);
                  await recordRecentSupplier(supplierId);
                  resolve(true);
                  return;
                }
                resolve(false);
              })();
            },
          },
        ],
      );
    });
  }

  Alert.alert(
    "Could not open app",
    "The supplier app may not be installed. Use Install App for the store listing, or Open Website.",
  );
  return false;
}

export function hubWebsiteForEntry(entry: SupplierHubEntry): string {
  return entry.websiteUrl ?? entry.website;
}

export function hubStoreUrlForEntry(entry: SupplierHubEntry): string | undefined {
  const config = getSupplierHubConfig(entry.id);
  if (config) return storeUrlForHubSupplier(config);
  return entry.appStoreUrl ?? entry.playStoreUrl ?? entry.iosAppUrl ?? entry.androidAppUrl;
}
