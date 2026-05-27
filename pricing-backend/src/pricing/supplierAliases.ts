/** Normalize supplier strings for cross-source matching (catalog slug vs live API label). */
export function normalizeSupplierKey(supplier: string): string {
  return supplier.toLowerCase().replace(/[^a-z0-9]/g, "");
}

export function isLowesSupplier(supplier: string): boolean {
  const s = normalizeSupplierKey(supplier);
  return s.includes("lowes");
}

export function isHomeDepotSupplier(supplier: string): boolean {
  const s = normalizeSupplierKey(supplier);
  return s.includes("homedepot") || s.includes("home depot");
}

export function isCityElectricSupplier(supplier: string): boolean {
  const s = normalizeSupplierKey(supplier);
  return s.includes("cityelectric") || (s.includes("city") && s.includes("electric"));
}
