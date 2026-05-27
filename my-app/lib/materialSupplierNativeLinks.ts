import type { MaterialSupplierDefinition, MaterialSupplierId } from "@/lib/materialSuppliers";

/** Deep links tried in order when opening a retailer app (optional search term). */
export function nativeLaunchUrlsForSupplier(
  def: MaterialSupplierDefinition,
  query?: string,
): string[] {
  const q = query?.trim();
  if (!q) return [...def.nativeUrls];

  const encoded = encodeURIComponent(q);
  const withQuery = urlsForQuery(def.id, encoded);
  const seen = new Set<string>();
  const out: string[] = [];
  for (const url of [...withQuery, ...def.nativeUrls]) {
    if (seen.has(url)) continue;
    seen.add(url);
    out.push(url);
  }
  return out;
}

function urlsForQuery(id: MaterialSupplierId, encoded: string): string[] {
  switch (id) {
    case "lowes":
      return [
        `lowes://www.lowes.com/search?searchTerm=${encoded}`,
        `lowes://search?searchTerm=${encoded}`,
      ];
    case "homedepot":
      return [
        `homedepot://www.homedepot.com/s/${encoded}`,
        `homedepot://search?query=${encoded}`,
      ];
    case "menards":
      return [`menards://search?search=${encoded}`];
    case "amazon":
      return [
        `com.amazon.mobile.shopping://www.amazon.com/s?k=${encoded}`,
        `amazon://www.amazon.com/s?k=${encoded}`,
      ];
    case "grainger":
      return [`grainger://search?searchQuery=${encoded}`];
    case "ace":
      return [`acehardware://search?q=${encoded}`];
    case "harbor_freight":
      return [`harborfreight://search?query=${encoded}`];
    case "truevalue":
      return [`truevalue://search?q=${encoded}`];
    default:
      return [];
  }
}
