import { nativeLaunchUrlsForSupplier } from "@/lib/materialSupplierNativeLinks";
import { materialSupplierById, type MaterialSupplierId } from "@/lib/materialSuppliers";
import { getMaterialVendorLaunchConfig } from "@/lib/materialVendorLaunchConfig";

const SUPPLY_HOUSE_QUERY_PATTERNS: Partial<Record<string, (encoded: string) => string[]>> = {
  graybar: (q) => [`graybar://search?search=${q}`],
  rexel: (q) => [`rexel://search?q=${q}`],
  cityelectric: (q) => [`cityelectric://search?q=${q}`, `ces://search?q=${q}`],
  wesco: (q) => [`wesco://search?q=${q}`],
  platt: (q) => [`platt://search?q=${q}`],
  ced: (q) => [`ced://search?q=${q}`],
  ferguson: (q) => [`ferguson://search?searchTerm=${q}`],
  grainger: (q) => [`grainger://search?searchQuery=${q}`],
  fastenal: (q) => [`fastenal://search?query=${q}`],
  elliott_electric: (q) => [`elliottelectric://search?q=${q}`],
  border_states: (q) => [`borderstates://search?q=${q}`],
};

/** Deep links tried in order when opening a supplier native app (optional search). */
export function buildSupplierDeepLinks(vendorKey: string, query?: string): string[] {
  const q = query?.trim();
  const appDef = materialSupplierById(vendorKey);
  if (appDef) {
    return nativeLaunchUrlsForSupplier(appDef, q);
  }

  const cfg = getMaterialVendorLaunchConfig(vendorKey);
  if (!cfg) return [];

  if (!q) return [...cfg.nativeUrls];

  const encoded = encodeURIComponent(q);
  const withQuery = SUPPLY_HOUSE_QUERY_PATTERNS[vendorKey]?.(encoded) ?? [];
  const generic = cfg.nativeUrls.map((base) => {
    const sep = base.includes("?") ? "&" : "?";
    return `${base}${sep}query=${encoded}`;
  });

  const seen = new Set<string>();
  const out: string[] = [];
  for (const url of [...withQuery, ...generic, ...cfg.nativeUrls]) {
    if (seen.has(url)) continue;
    seen.add(url);
    out.push(url);
  }
  return out;
}

export function isCatalogMaterialSupplierId(id: string): id is MaterialSupplierId {
  return materialSupplierById(id) != null;
}
