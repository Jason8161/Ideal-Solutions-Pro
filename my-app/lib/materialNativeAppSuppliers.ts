/** Materials flow: only Home Depot and Lowe's support native app launch. */
export const MATERIAL_NATIVE_APP_SUPPLIER_IDS = ["homedepot", "lowes"] as const;

export type MaterialNativeAppSupplierId = (typeof MATERIAL_NATIVE_APP_SUPPLIER_IDS)[number];

export function isMaterialNativeAppSupplier(id: string): id is MaterialNativeAppSupplierId {
  return (MATERIAL_NATIVE_APP_SUPPLIER_IDS as readonly string[]).includes(id);
}
