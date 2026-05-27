import { Alert, Platform } from "react-native";

import { isMaterialNativeAppSupplier } from "@/lib/materialNativeAppSuppliers";
import { safeOpenURL } from "@/lib/linkingSafe";
import { promptLowesAppStoreInstall } from "@/lib/supplierHub/launchActions";

import { loadEnabledSupplierIntegrationIds } from "@/lib/supplierIntegration/enabledIntegrationsStorage";
import {
  loadSupplierIntegrationPrefs,
  recordSupplierLastUsed,
} from "@/lib/supplierIntegration/preferencesStorage";
import { getIntegrationSupplierIds } from "@/lib/supplierIntegration/integrationSuppliers";
import { displayNameForSupplierId, storeUrlForSupplier, getSupplierById } from "@/lib/supplierIntegration/supplierRegistry";
import { webUrlForMaterialVendor } from "@/lib/materialVendorLaunchConfig";
import { tryOpenMaterialVendorNativeApp } from "@/lib/openMaterialVendorApp";
import { loadMaterialsSearchTileKeys } from "@/lib/materialsSearchSuppliers";

export type WebsiteFallbackPayload = {
  vendorKey: string;
  displayName: string;
  storeUrl?: string;
  webUrl: string;
  query?: string;
};

export type WebsiteFallbackChoice = "download" | "website" | "cancel";

export type LaunchUiHandlers = {
  confirmLaunch?: (displayName: string) => Promise<boolean>;
  showWebsiteFallback?: (payload: WebsiteFallbackPayload) => Promise<WebsiteFallbackChoice>;
};

function defaultConfirmLaunch(displayName: string): Promise<boolean> {
  return new Promise((resolve) => {
    Alert.alert(`Open ${displayName}?`, "Your search term will be passed to the supplier app or website.", [
      { text: "Cancel", style: "cancel", onPress: () => resolve(false) },
      { text: "Open", onPress: () => resolve(true) },
    ]);
  });
}

function defaultWebsiteFallback(payload: WebsiteFallbackPayload): Promise<WebsiteFallbackChoice> {
  return new Promise((resolve) => {
    const buttons: {
      text: string;
      style?: "cancel" | "destructive";
      onPress?: () => void;
    }[] = [];
    if (payload.storeUrl) {
      buttons.push({
        text: "Download app",
        onPress: () => resolve("download"),
      });
    }
    buttons.push({
      text: "Continue to website",
      onPress: () => resolve("website"),
    });
    buttons.push({ text: "Cancel", style: "cancel", onPress: () => resolve("cancel") });
    Alert.alert(
      `${payload.displayName} app not installed`,
      "Open the supplier website with your search term, or install their app from the store.",
      buttons,
    );
  });
}

async function assertOnMaterialsSearchList(key: string, displayName: string): Promise<boolean> {
  const allowed = await loadMaterialsSearchTileKeys();
  if (allowed.includes(key)) return true;
  Alert.alert(
    "Not on your list",
    `Add ${displayName} under Settings → My supply houses or Material search suppliers.`,
  );
  return false;
}

async function openWebsite(vendorKey: string, query?: string): Promise<void> {
  const url = webUrlForMaterialVendor(vendorKey, query);
  if (!url) {
    Alert.alert("Not found", "This supplier is no longer available.");
    return;
  }
  const opened = await safeOpenURL(url);
  if (!opened) {
    Alert.alert("Could not open", "This link is not available on your device.");
  }
}

/**
 * Launch supplier native app or website per integration preferences.
 */
export async function launchMaterialSupplier(
  vendorKey: string,
  options?: { query?: string; ui?: LaunchUiHandlers; skipListCheck?: boolean },
): Promise<boolean> {
  const displayName = displayNameForSupplierId(vendorKey);
  if (!options?.skipListCheck && !(await assertOnMaterialsSearchList(vendorKey, displayName))) {
    return false;
  }

  if (!isMaterialNativeAppSupplier(vendorKey)) {
    await openWebsite(vendorKey, options?.query);
    await recordSupplierLastUsed(vendorKey);
    return true;
  }

  const prefs = await loadSupplierIntegrationPrefs();
  const integrationIds = new Set(getIntegrationSupplierIds());
  if (integrationIds.has(vendorKey)) {
    const enabled = await loadEnabledSupplierIntegrationIds();
    if (!enabled.includes(vendorKey)) {
      await openWebsite(vendorKey, options?.query);
      await recordSupplierLastUsed(vendorKey);
      return true;
    }
  }

  if (!prefs.enableSupplierApps) {
    await openWebsite(vendorKey, options?.query);
    await recordSupplierLastUsed(vendorKey);
    return true;
  }

  if (prefs.askBeforeLaunch) {
    const confirm = options?.ui?.confirmLaunch ?? defaultConfirmLaunch;
    const ok = await confirm(displayName);
    if (!ok) return false;
  }

  let opened = false;
  if (prefs.autoOpenInstalled && isMaterialNativeAppSupplier(vendorKey)) {
    opened = await tryOpenMaterialVendorNativeApp(vendorKey, options?.query, {
      aggressive: Platform.OS === "android",
    });
  }

  if (opened) {
    await recordSupplierLastUsed(vendorKey);
    return true;
  }

  if (!prefs.websiteFallback) {
    const record = getSupplierById(vendorKey);
    const storeUrl = record ? storeUrlForSupplier(record) : undefined;
    if (storeUrl && prefs.websiteFallback !== false) {
      /* user disabled fallback only — still offer store */
    }
    if (storeUrl) {
      Alert.alert(
        `${displayName} app not found`,
        Platform.OS === "ios"
          ? "Install the app from the App Store to open it from Materials search."
          : "Install the app from Play Store to open it from Materials search.",
      );
    } else {
      Alert.alert(`${displayName}`, "No native app mapping — opening website.");
      await openWebsite(vendorKey, options?.query);
      await recordSupplierLastUsed(vendorKey);
      return true;
    }
    return false;
  }

  const record = getSupplierById(vendorKey);
  const storeUrl =
    isMaterialNativeAppSupplier(vendorKey) && record ? storeUrlForSupplier(record) : undefined;
  const payload: WebsiteFallbackPayload = {
    vendorKey,
    displayName,
    storeUrl,
    webUrl: webUrlForMaterialVendor(vendorKey, options?.query) ?? record?.website ?? "https://www.google.com/",
    query: options?.query,
  };

  const showFallback = options?.ui?.showWebsiteFallback ?? defaultWebsiteFallback;
  const choice = await showFallback(payload);
  if (choice === "cancel") return false;
  if (choice === "download" && payload.storeUrl) {
    if (vendorKey === "lowes") {
      await promptLowesAppStoreInstall();
      return true;
    }
    await safeOpenURL(payload.storeUrl);
    return true;
  }
  await openWebsite(vendorKey, options?.query);
  await recordSupplierLastUsed(vendorKey);
  return true;
}
