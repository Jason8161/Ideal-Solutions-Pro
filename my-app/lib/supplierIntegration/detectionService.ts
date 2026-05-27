import { Platform } from "react-native";

import { isMaterialNativeAppSupplier } from "@/lib/materialNativeAppSuppliers";
import { safeCanOpenAny, safeCanOpenURL } from "@/lib/linkingSafe";
import { isMaterialVendorNativeAvailable } from "@/lib/openMaterialVendorApp";
import { getSupplierById } from "@/lib/supplierIntegration/supplierRegistry";

/**
 * Whether the supplier's native app appears installed (Home Depot, Lowe's only).
 * iOS: Linking.canOpenURL on homedepot:// and lowes:// only.
 * Android: curated packages/schemes plus optional launcher match when supported.
 */
export async function detectSupplierAppInstalled(vendorKey: string): Promise<boolean> {
  if (!vendorKey || typeof vendorKey !== "string") return false;
  if (!isMaterialNativeAppSupplier(vendorKey)) return false;

  const record = getSupplierById(vendorKey);
  const nativeUrls = record?.nativeUrls;
  if (nativeUrls?.length) {
    if (await safeCanOpenAny(nativeUrls)) return true;
  }

  const scheme = record?.appScheme?.trim();
  if (scheme) {
    if (await safeCanOpenURL(`${scheme}://`)) return true;
  }

  if (Platform.OS === "android") {
    return isMaterialVendorNativeAvailable(vendorKey);
  }

  return false;
}

export async function detectInstalledMap(vendorKeys: readonly string[]): Promise<Record<string, boolean>> {
  if (!Array.isArray(vendorKeys) || vendorKeys.length === 0) return {};
  const nativeKeys = vendorKeys.filter((key) => isMaterialNativeAppSupplier(key));
  if (!nativeKeys.length) return {};
  const entries = await Promise.all(
    nativeKeys.map(async (key) => [key, await detectSupplierAppInstalled(key)] as const),
  );
  return Object.fromEntries(entries);
}
