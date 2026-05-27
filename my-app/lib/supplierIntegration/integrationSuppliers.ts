import { isMaterialNativeAppSupplier, MATERIAL_NATIVE_APP_SUPPLIER_IDS } from "@/lib/materialNativeAppSuppliers";
import { getAllSuppliers, getSupplierById } from "@/lib/supplierIntegration/supplierRegistry";
import type { SupplierRecord } from "@/lib/supplierIntegration/types";

/**
 * Curated suppliers for Settings → Enable Supplier Integrations.
 * iOS cannot enumerate installed apps — only predefined entries are shown.
 */
/** Static catalog for Settings → Enable Supplier Integrations (iOS-safe; no device app scan). */
/** Home Depot, Lowe's, Grainger, Graybar, Rexel, CES, Ferguson, Platt — static catalog only. */
export const INTEGRATION_SUPPLIER_ORDER: readonly string[] = [
  "homedepot",
  "lowes",
  "grainger",
  "graybar",
  "rexel",
  "cityelectric",
  "ferguson",
  "platt",
];

/** Suppliers with native app launch + enable switch (Home Depot, Lowe's only). */
export function getIntegrationSupplierIds(): string[] {
  return [...MATERIAL_NATIVE_APP_SUPPLIER_IDS];
}

export function getIntegrationSuppliers(): SupplierRecord[] {
  const byId = new Map(getAllSuppliers().map((s) => [s.id, s]));
  return getIntegrationSupplierIds()
    .map((id) => byId.get(id))
    .filter((s): s is SupplierRecord => s != null);
}

export function supplierSupportsNativeIntegration(record: SupplierRecord): boolean {
  return isMaterialNativeAppSupplier(record.id);
}

export function integrationSupplierById(id: string): SupplierRecord | undefined {
  if (!getIntegrationSupplierIds().includes(id)) return undefined;
  return getSupplierById(id);
}
