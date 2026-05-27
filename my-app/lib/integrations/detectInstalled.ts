import { Platform } from "react-native";

import { MISC_ANDROID_PACKAGES } from "@/lib/integrations/miscAndroidPackages";
import type { MiscIntegrationDefinition } from "@/lib/integrations/types";
import { isAndroidPackageInstalled } from "@/lib/installedPhoneApps";
import { safeCanOpenAny } from "@/lib/linkingSafe";

/** Installed check via declared schemes / known package only — never scans the device app list. */
export async function isMiscIntegrationInstalled(def: MiscIntegrationDefinition): Promise<boolean> {
  if (Platform.OS === "android") {
    const pkg = MISC_ANDROID_PACKAGES[def.id];
    if (pkg && (await isAndroidPackageInstalled(pkg))) return true;
  }
  if (def.appSchemeUrls.length === 0) return false;
  return safeCanOpenAny(def.appSchemeUrls);
}

export async function detectMiscInstalledMap(
  defs: readonly MiscIntegrationDefinition[],
): Promise<Record<string, boolean>> {
  if (!defs.length) return {};
  try {
    const entries = await Promise.all(
      defs.map(async (def) => {
        try {
          return [def.id, await isMiscIntegrationInstalled(def)] as const;
        } catch {
          return [def.id, false] as const;
        }
      }),
    );
    return Object.fromEntries(entries);
  } catch {
    return {};
  }
}
