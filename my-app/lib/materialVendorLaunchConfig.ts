import { isMaterialNativeAppSupplier } from "@/lib/materialNativeAppSuppliers";
import { buildSupplierDeepLinks } from "@/lib/supplierIntegration/deepLinkBuilder";
import { nativeLaunchUrlsForSupplier } from "@/lib/materialSupplierNativeLinks";
import {
  materialSupplierById,
  webSearchUrlForSupplier,
  type MaterialSupplierDefinition,
  type MaterialSupplierId,
} from "@/lib/materialSuppliers";
import { buildSupplyHouseSearchUrl, labelForSupplyHousePreset, type SupplyHousePresetId } from "@/lib/supplierPresets";

export type MaterialVendorLaunchConfig = {
  vendorKey: string;
  displayName: string;
  nativeUrls: readonly string[];
  androidPackages: readonly string[];
  /** Lowercase substrings matched against launcher app labels (Android). */
  launcherNameHints: readonly string[];
};

function packageFromPlayStoreUrl(url: string): string | undefined {
  const m = /[?&]id=([^&]+)/.exec(url);
  return m?.[1];
}

function configFromSupplier(def: MaterialSupplierDefinition): MaterialVendorLaunchConfig {
  const nativeOnly = isMaterialNativeAppSupplier(def.id);
  const androidPackage = packageFromPlayStoreUrl(def.androidStoreUrl);
  const androidPackages =
    nativeOnly && def.androidPackages?.length
      ? [...def.androidPackages]
      : nativeOnly && androidPackage
        ? [androidPackage]
        : [];
  const launcherNameHints = def.launcherNameHints?.length
    ? [...def.launcherNameHints]
    : [def.name.toLowerCase()];
  return {
    vendorKey: def.id,
    displayName: def.name,
    nativeUrls: nativeOnly ? def.nativeUrls : [],
    androidPackages,
    launcherNameHints: nativeOnly ? launcherNameHints : [],
  };
}

export function getMaterialVendorLaunchConfig(vendorKey: string): MaterialVendorLaunchConfig | null {
  if (!isMaterialNativeAppSupplier(vendorKey)) {
    const appDef = materialSupplierById(vendorKey);
    if (appDef) {
      return {
        vendorKey: appDef.id,
        displayName: appDef.name,
        nativeUrls: [],
        androidPackages: [],
        launcherNameHints: [],
      };
    }
    const label = labelForSupplyHousePreset(vendorKey);
    if (label) {
      return {
        vendorKey,
        displayName: label,
        nativeUrls: [],
        androidPackages: [],
        launcherNameHints: [],
      };
    }
    return null;
  }

  const appDef = materialSupplierById(vendorKey);
  if (appDef) return configFromSupplier(appDef);

  return null;
}

export function nativeLaunchUrlsForVendor(vendorKey: string, query?: string): string[] {
  if (!isMaterialNativeAppSupplier(vendorKey)) return [];

  const built = buildSupplierDeepLinks(vendorKey, query);
  if (built.length > 0) return built;

  const appDef = materialSupplierById(vendorKey);
  if (appDef) return nativeLaunchUrlsForSupplier(appDef, query);

  const cfg = getMaterialVendorLaunchConfig(vendorKey);
  if (!cfg) return [];
  return [...cfg.nativeUrls];
}

export function webUrlForMaterialVendor(vendorKey: string, query?: string): string | null {
  const appDef = materialSupplierById(vendorKey);
  if (appDef) return webSearchUrlForSupplier(appDef.id as MaterialSupplierId, query);
  return buildSupplyHouseSearchUrl(vendorKey, query?.trim() ?? "");
}
