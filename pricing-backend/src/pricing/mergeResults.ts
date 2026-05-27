import type { ProductWithPricing } from "./contracts";
import {
  isCityElectricSupplier,
  isHomeDepotSupplier,
  isLowesSupplier,
} from "./supplierAliases";

/** Prefer live retailer rows over cached CSV/DB rows for the same store. */
export function mergeSearchResults(cached: ProductWithPricing[], live: ProductWithPricing[]): ProductWithPricing[] {
  let out = [...cached];

  const liveLowes = live.filter((r) => isLowesSupplier(r.supplier));
  if (liveLowes.length > 0) {
    out = out.filter((r) => !isLowesSupplier(r.supplier));
    out.push(...liveLowes);
  } else if (!out.some((r) => isLowesSupplier(r.supplier))) {
    out.push(...live.filter((r) => isLowesSupplier(r.supplier)));
  }

  const liveHd = live.filter((r) => isHomeDepotSupplier(r.supplier));
  if (liveHd.length > 0) {
    out = out.filter((r) => !isHomeDepotSupplier(r.supplier));
    out.push(...liveHd);
  } else if (!out.some((r) => isHomeDepotSupplier(r.supplier))) {
    out.push(...live.filter((r) => isHomeDepotSupplier(r.supplier)));
  }

  const liveCe = live.filter((r) => isCityElectricSupplier(r.supplier));
  if (liveCe.length > 0) {
    out = out.filter((r) => !isCityElectricSupplier(r.supplier));
    out.push(...liveCe);
  } else if (!out.some((r) => isCityElectricSupplier(r.supplier))) {
    out.push(...live.filter((r) => isCityElectricSupplier(r.supplier)));
  }

  const rest = live.filter(
    (r) =>
      !isLowesSupplier(r.supplier) &&
      !isHomeDepotSupplier(r.supplier) &&
      !isCityElectricSupplier(r.supplier),
  );
  if (rest.length > 0) out.push(...rest);

  return out;
}

export function mergeAllSearchChunks(chunks: ProductWithPricing[][]): ProductWithPricing[] {
  let merged: ProductWithPricing[] = [];
  for (const chunk of chunks) {
    if (chunk.length === 0) continue;
    merged = mergeSearchResults(merged, chunk);
  }
  return merged;
}
