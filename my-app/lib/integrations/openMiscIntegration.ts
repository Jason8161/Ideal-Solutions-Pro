import { Alert, Platform } from "react-native";

import { detectMiscInstalledMap } from "@/lib/integrations/detectInstalled";
import { MISC_ANDROID_PACKAGES } from "@/lib/integrations/miscAndroidPackages";
import { miscIntegrationById } from "@/lib/integrations/miscCatalog";
import type { MiscIntegrationDefinition } from "@/lib/integrations/types";
import { launchAndroidPackage } from "@/lib/installedPhoneApps";
import { safeOpenFirstAvailable, safeOpenURL } from "@/lib/linkingSafe";

function storeUrl(def: MiscIntegrationDefinition): string {
  return Platform.OS === "ios" ? def.iosStoreUrl : def.androidStoreUrl;
}

async function tryLaunchAndroidPackage(def: MiscIntegrationDefinition): Promise<boolean> {
  const pkg = MISC_ANDROID_PACKAGES[def.id];
  if (!pkg) return false;
  try {
    await launchAndroidPackage(pkg);
    return true;
  } catch {
    return false;
  }
}

export async function openMiscIntegration(id: string): Promise<boolean> {
  const def = miscIntegrationById(id);
  if (!def) return false;

  if (Platform.OS === "android" && (await tryLaunchAndroidPackage(def))) return true;

  if (def.appSchemeUrls.length > 0) {
    const opened = await safeOpenFirstAvailable(def.appSchemeUrls, {
      allowAggressiveCustomScheme: Platform.OS === "android",
    });
    if (opened) return true;
  }

  const installed = await detectMiscInstalledMap([def]);
  if (!installed[def.id]) {
    Alert.alert(
      `${def.name} app not detected`,
      "Open the website or install the app from your store. Ideal Solutions Pro only checks known app links — it does not scan your phone for apps.",
      [
        { text: "Cancel", style: "cancel" },
        { text: "Open website", onPress: () => void safeOpenURL(def.website) },
        { text: "Get app", onPress: () => void safeOpenURL(storeUrl(def)) },
      ],
    );
    return false;
  }

  return safeOpenURL(def.website);
}
